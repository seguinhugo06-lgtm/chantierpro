import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  X,
  Plus,
  Trash2,
  RefreshCw,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronLeft,
  Image,
  Loader,
  Euro,
  ShieldCheck,
  ArrowRight,
  Search,
  BarChart3,
  Mic,
  MicOff,
  Edit3,
  ChevronDown,
} from 'lucide-react';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { analyseTranscript } from '../../lib/integrations/ai-devis';

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

const fmtShortDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
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

const UNITES = ['u', 'm²', 'ml', 'm³', 'h', 'forfait', 'jour', 'kg', 'L', 'lot', 'ensemble'];

const STATUTS = {
  en_cours: { label: 'En cours', color: 'blue', icon: Clock },
  terminee: { label: 'Terminée', color: 'green', icon: CheckCircle },
  erreur: { label: 'Erreur', color: 'red', icon: AlertCircle },
  appliquee: { label: 'Appliquée', color: 'purple', icon: FileText },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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

function KpiCard({ icon: Icon, label, value, isDark, couleur }) {
  return (
    <div className={`rounded-xl border p-3 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={15} style={{ color: couleur }} />
        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
      </div>
      <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

function AnalysisCard({ analyse, isDark, couleur, onClick }) {
  const SourceIcon = analyse.source === 'photo' ? Camera : Mic;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-4 transition-all hover:shadow-md ${isDark ? 'bg-slate-800 border-slate-700 hover:border-slate-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <SourceIcon size={14} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
          <StatusBadge statut={analyse.statut} isDark={isDark} />
        </div>
        <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          {fmtShortDate(analyse.created_at)}
        </span>
      </div>
      <p className={`text-sm font-medium truncate mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
        {analyse.description || 'Sans description'}
      </p>
      <div className="flex items-center justify-between">
        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {analyse.analyse_resultat?.lignes?.length || analyse.analyse_resultat?.travaux?.length || 0} postes
        </span>
        <span className="text-sm font-bold" style={{ color: couleur }}>
          {fmtCurrency.format(analyse.analyse_resultat?.totalHT || 0)}
        </span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function IADevisAnalyse({
  catalogue = [],
  clients = [],
  isDark = false,
  couleur = '#f97316',
  onCreateDevis,
}) {
  // ---- State ----
  const [analyses, setAnalyses] = useState(() => loadAnalyses());
  const [view, setView] = useState('list');
  const [selectedId, setSelectedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [sortOrder, setSortOrder] = useState('recent');

  // Convert to devis modal
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertClient, setConvertClient] = useState('');
  const [convertTva, setConvertTva] = useState(20);
  const [convertNotes, setConvertNotes] = useState('');

  // New analysis
  const [activeTab, setActiveTab] = useState('voice');
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [progressLabel, setProgressLabel] = useState('');
  const [analyseResult, setAnalyseResult] = useState(null);
  const [editableLines, setEditableLines] = useState([]);

  // Voice state
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [manualText, setManualText] = useState('');

  // Photo state
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [photoDescription, setPhotoDescription] = useState('');

  const fileInputRef = useRef(null);

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

  // ---- Theme ----
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputCls = isDark
    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
    : 'bg-white border-slate-300 text-slate-900';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const pageBg = isDark ? 'bg-slate-900' : 'bg-slate-50';

  // ---- Derived ----
  const selectedAnalyse = analyses.find(a => a.id === selectedId) || null;
  const currentText = activeTab === 'voice' ? (transcript || manualText) : photoDescription;

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

  const totalHTAll = analyses.reduce((s, a) => s + (a.analyse_resultat?.totalHT || 0), 0);
  const avgConfiance = analyses.length > 0
    ? Math.round(analyses.reduce((s, a) => s + (a.confiance || 0), 0) / analyses.length)
    : 0;

  // Editable lines total
  const editableTotalHT = editableLines.reduce((s, l) => s + (l.quantite * l.prixUnitaire || 0), 0);

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
  }, []);

  const handleOpenNew = () => { resetNewFlow(); setView('new'); };

  const handleBackToList = () => { resetNewFlow(); setView('list'); setSelectedId(null); };

  const handleSelectAnalyse = (id) => { setSelectedId(id); setView('detail'); };

  const handleDeleteAnalyse = (id) => {
    setAnalyses(prev => prev.filter(a => a.id !== id));
    if (selectedId === id) { setSelectedId(null); setView('list'); }
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith('image/')) return;
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  // ---- Analysis ----

  const handleStartAnalysis = async () => {
    const text = activeTab === 'voice' ? (transcript.trim() || manualText.trim()) : photoDescription.trim();
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
    setEditableLines(prev => prev.filter((_, i) => i !== idx));
  };

  // Create devis
  const handleCreateDevis = () => {
    if (!editableLines.length) return;
    setConvertClient('');
    setConvertTva(20);
    setConvertNotes('');
    setShowConvertModal(true);
  };

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
    setConvertClient('');
    setConvertTva(20);
    setConvertNotes('');
    setShowConvertModal(true);
  };

  const handleConfirmCreateDevis = () => {
    if (!editableLines.length && !analyseResult) return;
    const lines = editableLines.length > 0 ? editableLines : (analyseResult?.lignes || []);
    const totalHT = Math.round(lines.reduce((s, l) => s + (l.quantite * l.prixUnitaire || 0), 0) * 100) / 100;

    // Mark as applied in history
    if (selectedId) {
      setAnalyses(prev => prev.map(a => a.id === selectedId ? { ...a, statut: 'appliquee' } : a));
    }

    onCreateDevis({
      lignes: lines.map(l => ({
        designation: l.designation,
        quantite: l.quantite,
        unite: l.unite,
        prixUnitaire: l.prixUnitaire,
        totalHT: Math.round(l.quantite * l.prixUnitaire * 100) / 100,
      })),
      description: analyseResult?.description || transcript.substring(0, 100) || 'Devis IA',
      totalHT,
      source: 'ia_analyse',
      analyseId: selectedId,
      client_id: convertClient || undefined,
      tvaRate: convertTva,
      notes: convertNotes.trim() || analyseResult?.notes || undefined,
    });
    setShowConvertModal(false);
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================

  // ---- LIST VIEW ----
  const renderListView = () => (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>Devis IA</h1>
          <p className={`text-sm ${textMuted}`}>Dictez vos travaux, l'IA génère le devis</p>
        </div>
        <button
          onClick={handleOpenNew}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold shadow-md hover:shadow-lg transition-all hover:scale-105"
          style={{ backgroundColor: couleur }}
        >
          <Plus className="w-4 h-4" />
          Nouvelle analyse
        </button>
      </div>

      {analyses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: couleur + '18' }}>
            <Mic className="w-10 h-10" style={{ color: couleur }} />
          </div>
          <h2 className={`text-xl font-bold mb-2 ${textPrimary}`}>Devis IA vocal</h2>
          <p className={`text-sm text-center max-w-md mb-6 ${textMuted}`}>
            Décrivez les travaux à voix haute et notre IA génèrera automatiquement une estimation détaillée avec les prix du marché.
          </p>
          <button
            onClick={handleOpenNew}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
            style={{ backgroundColor: couleur }}
          >
            <Mic className="w-5 h-5" />
            Dicter un devis
          </button>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <KpiCard icon={BarChart3} label="Analyses" value={analyses.length} isDark={isDark} couleur={couleur} />
            <KpiCard icon={Euro} label="Total HT" value={fmtCurrency.format(totalHTAll)} isDark={isDark} couleur={couleur} />
            <KpiCard icon={ShieldCheck} label="Confiance" value={`${avgConfiance}%`} isDark={isDark} couleur={couleur} />
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm ${inputCls} focus:outline-none focus:ring-2`}
              style={{ '--tw-ring-color': couleur }}
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {[{ key: null, label: 'Tous' }, { key: 'terminee', label: 'Terminées' }, { key: 'appliquee', label: 'Appliquées' }].map(f => (
              <button
                key={f.key || 'all'}
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === f.key ? 'text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                }`}
                style={statusFilter === f.key ? { backgroundColor: couleur } : {}}
              >
                {f.label}
              </button>
            ))}
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              className={`ml-auto text-xs px-2 py-1.5 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200'}`}
            >
              <option value="recent">Récentes</option>
              <option value="oldest">Anciennes</option>
              <option value="montant_desc">Montant ↓</option>
            </select>
          </div>

          {/* Cards */}
          <div className="space-y-3">
            {filteredAnalyses.map(a => (
              <AnalysisCard key={a.id} analyse={a} isDark={isDark} couleur={couleur} onClick={() => handleSelectAnalyse(a.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  );

  // ---- NEW ANALYSIS VIEW ----
  const renderNewView = () => (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={handleBackToList} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
          <ChevronLeft size={20} className={textPrimary} />
        </button>
        <div className="flex-1">
          <h2 className={`text-lg font-bold ${textPrimary}`}>Nouveau devis IA</h2>
          <p className={`text-xs ${textMuted}`}>
            {step === 1 ? 'Décrivez les travaux' : step === 2 ? 'Analyse en cours...' : 'Résultats'}
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6">
        {[
          { n: 1, label: activeTab === 'voice' ? 'Dictée' : 'Photo' },
          { n: 2, label: 'Analyse' },
          { n: 3, label: 'Résultats' },
        ].map((s, i) => (
          <React.Fragment key={s.n}>
            {i > 0 && <div className={`flex-1 h-0.5 ${step >= s.n ? '' : isDark ? 'bg-slate-700' : 'bg-slate-200'}`} style={step >= s.n ? { backgroundColor: couleur } : {}} />}
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step >= s.n ? 'text-white' : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'
              }`}
              style={step >= s.n ? { backgroundColor: couleur } : {}}
            >
              {s.n}
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* ===== STEP 1: Input ===== */}
      {step === 1 && (
        <>
          {/* Tabs */}
          <div className={`flex border-b mb-5 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <button
              onClick={() => setActiveTab('voice')}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'voice' ? 'border-current' : 'border-transparent'
              }`}
              style={activeTab === 'voice' ? { color: couleur, borderColor: couleur } : {}}
            >
              <Mic size={16} />
              Voix
            </button>
            <button
              onClick={() => setActiveTab('photo')}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'photo' ? 'border-current' : 'border-transparent'
              }`}
              style={activeTab === 'photo' ? { color: couleur, borderColor: couleur } : {}}
            >
              <Camera size={16} />
              Photo
            </button>
          </div>

          {/* Voice Tab */}
          {activeTab === 'voice' && (
            <div className="flex flex-col items-center">
              {/* Mic button */}
              {isSupported ? (
                <>
                  <button
                    onClick={toggleListening}
                    className={`w-20 h-20 rounded-full flex items-center justify-center mb-3 transition-all shadow-lg ${
                      isListening ? 'animate-pulse' : 'hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: isListening ? '#EF4444' : couleur,
                      boxShadow: isListening ? '0 0 0 8px rgba(239,68,68,0.2)' : undefined,
                    }}
                  >
                    {isListening ? <MicOff size={32} className="text-white" /> : <Mic size={32} className="text-white" />}
                  </button>
                  <p className={`text-sm mb-4 ${isListening ? 'text-red-500 font-medium' : textMuted}`}>
                    {isListening ? 'En écoute... appuyez pour arrêter' : 'Appuyez pour dicter'}
                  </p>
                </>
              ) : (
                <div className={`w-full p-3 rounded-lg mb-4 text-xs ${isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
                  <AlertCircle size={14} className="inline mr-1" />
                  La saisie vocale n'est pas disponible sur ce navigateur. Saisissez le texte ci-dessous.
                </div>
              )}

              {voiceError && (
                <div className={`w-full p-3 rounded-lg mb-4 text-xs ${isDark ? 'bg-red-500/15 text-red-300' : 'bg-red-50 text-red-700'}`}>
                  <AlertCircle size={14} className="inline mr-1" />
                  {voiceError}
                </div>
              )}

              {/* Transcript display */}
              {(transcript || interimText) && (
                <div className={`w-full rounded-xl border p-4 mb-4 min-h-[100px] ${cardBg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium ${textMuted}`}>Transcription</span>
                    {transcript && (
                      <button onClick={() => { setTranscript(''); setInterimText(''); }} className={`text-xs ${textMuted} hover:text-red-500`}>
                        Effacer
                      </button>
                    )}
                  </div>
                  <p className={`text-sm leading-relaxed ${textPrimary}`}>
                    {transcript}
                    {interimText && <span className={`italic ${textMuted}`}>{transcript ? ' ' : ''}{interimText}</span>}
                  </p>
                </div>
              )}

              {/* Manual text fallback */}
              <div className="w-full mb-4">
                <div className={`flex items-center gap-2 mb-2 ${textMuted}`}>
                  <div className={`flex-1 h-px ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  <span className="text-[11px]">ou saisissez manuellement</span>
                  <div className={`flex-1 h-px ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                </div>
                <textarea
                  value={manualText}
                  onChange={e => setManualText(e.target.value)}
                  placeholder="Ex : Rénovation salle de bain 8m², pose carrelage sol et murs, remplacement baignoire par douche..."
                  rows={3}
                  className={`w-full rounded-lg border p-3 text-sm resize-none ${inputCls} focus:outline-none focus:ring-2`}
                  style={{ '--tw-ring-color': couleur }}
                />
                <p className={`text-[11px] mt-1 ${textMuted}`}>
                  {(transcript || manualText).length} caractères
                </p>
              </div>
            </div>
          )}

          {/* Photo Tab */}
          {activeTab === 'photo' && (
            <div>
              {!preview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all hover:border-current ${isDark ? 'border-slate-600 hover:bg-slate-800/50' : 'border-slate-300 hover:bg-slate-50'}`}
                  style={{ '--tw-border-opacity': 1 }}
                >
                  <Upload className={`w-10 h-10 mx-auto mb-3 ${textMuted}`} />
                  <p className={`text-sm font-medium mb-1 ${textPrimary}`}>Ajouter une photo</p>
                  <p className={`text-xs ${textMuted}`}>JPG, PNG ou HEIC</p>
                </div>
              ) : (
                <div className="relative mb-4">
                  <img src={preview} alt="Photo chantier" className="w-full h-48 object-cover rounded-xl" />
                  <button
                    onClick={() => { setFile(null); setPreview(null); }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

              <textarea
                value={photoDescription}
                onChange={e => setPhotoDescription(e.target.value)}
                placeholder="Décrivez les travaux visibles sur la photo..."
                rows={3}
                className={`w-full rounded-lg border p-3 text-sm resize-none mt-4 ${inputCls} focus:outline-none focus:ring-2`}
                style={{ '--tw-ring-color': couleur }}
              />
            </div>
          )}

          {error && (
            <div className={`p-3 rounded-lg text-xs mt-3 ${isDark ? 'bg-red-500/15 text-red-300' : 'bg-red-50 text-red-700'}`}>
              <AlertCircle size={14} className="inline mr-1" />
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-6">
            <button onClick={handleBackToList} className={`px-4 py-2.5 rounded-lg text-sm ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}>
              ← Retour
            </button>
            <button
              onClick={handleStartAnalysis}
              disabled={currentText.length < 10}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg"
              style={{ backgroundColor: couleur }}
            >
              <Sparkles size={18} />
              Analyser
              <ArrowRight size={16} />
            </button>
          </div>
        </>
      )}

      {/* ===== STEP 2: Analysing ===== */}
      {step === 2 && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative w-16 h-16 mb-6">
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-20"
              style={{ backgroundColor: couleur }}
            />
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: couleur }}
            >
              <Sparkles size={28} className="text-white animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          </div>
          <p className={`text-sm font-medium mb-2 ${textPrimary}`}>{progressLabel}</p>
          <p className={`text-xs ${textMuted}`}>Quelques secondes...</p>
        </div>
      )}

      {/* ===== STEP 3: Results ===== */}
      {step === 3 && analyseResult && (
        <div>
          {/* Summary banner */}
          <div className={`rounded-xl border p-4 mb-4 ${cardBg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${textPrimary}`}>{analyseResult.description}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                analyseResult.confiance >= 80 ? 'bg-emerald-100 text-emerald-700' :
                analyseResult.confiance >= 60 ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {analyseResult.confiance}% confiance
              </span>
            </div>
            {analyseResult.notes && (
              <p className={`text-xs ${textMuted}`}>💡 {analyseResult.notes}</p>
            )}
          </div>

          {/* Editable lines table */}
          <div className={`rounded-xl border overflow-hidden mb-4 ${cardBg}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={isDark ? 'bg-slate-700/50' : 'bg-slate-50'}>
                    <th className={`text-left px-3 py-2 text-xs font-medium ${textMuted}`}>Désignation</th>
                    <th className={`text-right px-2 py-2 text-xs font-medium ${textMuted} w-16`}>Qté</th>
                    <th className={`text-center px-2 py-2 text-xs font-medium ${textMuted} w-20`}>Unité</th>
                    <th className={`text-right px-2 py-2 text-xs font-medium ${textMuted} w-20`}>P.U. HT</th>
                    <th className={`text-right px-3 py-2 text-xs font-medium ${textMuted} w-20`}>Total</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {editableLines.map((line, idx) => (
                    <tr key={line.id} className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={line.designation}
                          onChange={e => updateLine(idx, 'designation', e.target.value)}
                          className={`w-full bg-transparent text-sm ${textPrimary} outline-none`}
                          placeholder="Poste..."
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={line.quantite}
                          onChange={e => updateLine(idx, 'quantite', parseFloat(e.target.value) || 0)}
                          className={`w-14 text-right bg-transparent text-sm ${textPrimary} outline-none`}
                          min="0"
                          step="0.1"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={line.unite}
                          onChange={e => updateLine(idx, 'unite', e.target.value)}
                          className={`w-full bg-transparent text-xs text-center ${textPrimary} outline-none`}
                        >
                          {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={line.prixUnitaire}
                          onChange={e => updateLine(idx, 'prixUnitaire', parseFloat(e.target.value) || 0)}
                          className={`w-16 text-right bg-transparent text-sm ${textPrimary} outline-none`}
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className={`px-3 py-2 text-right text-sm font-medium ${textPrimary}`}>
                        {fmtCurrency.format(line.quantite * line.prixUnitaire)}
                      </td>
                      <td className="pr-2">
                        <button onClick={() => removeLine(idx)} className="p-1 text-red-400 hover:text-red-600 rounded">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add line */}
            <button
              onClick={addLine}
              className={`w-full px-3 py-2 text-xs font-medium flex items-center gap-1 border-t ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-700/50' : 'border-slate-100 text-slate-500 hover:bg-slate-50'}`}
            >
              <Plus size={14} />
              Ajouter un poste
            </button>
          </div>

          {/* Total */}
          <div className={`rounded-xl border p-4 mb-6 ${cardBg}`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${textPrimary}`}>Total HT</span>
              <span className="text-xl font-bold" style={{ color: couleur }}>
                {fmtCurrency.format(editableTotalHT)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setStep(1); setAnalyseResult(null); setEditableLines([]); }}
              className={`px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <RefreshCw size={14} />
              Refaire
            </button>
            <button
              onClick={handleCreateDevis}
              disabled={editableLines.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold transition-all hover:shadow-lg disabled:opacity-40"
              style={{ backgroundColor: couleur }}
            >
              <FileText size={18} />
              Créer le devis
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ---- DETAIL VIEW ----
  const renderDetailView = () => {
    if (!selectedAnalyse) return null;
    const res = selectedAnalyse.analyse_resultat;
    const lignes = res?.lignes || res?.travaux || [];

    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={handleBackToList} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
            <ChevronLeft size={20} className={textPrimary} />
          </button>
          <div className="flex-1">
            <h2 className={`text-lg font-bold ${textPrimary}`}>Détail analyse</h2>
            <p className={`text-xs ${textMuted}`}>{fmtDate(selectedAnalyse.created_at)}</p>
          </div>
          <StatusBadge statut={selectedAnalyse.statut} isDark={isDark} />
        </div>

        <div className={`rounded-xl border p-4 mb-4 ${cardBg}`}>
          <p className={`text-sm mb-2 ${textPrimary}`}>{selectedAnalyse.description}</p>
          <div className="flex items-center gap-3 text-xs">
            {selectedAnalyse.source === 'voice' ? <Mic size={14} className={textMuted} /> : <Camera size={14} className={textMuted} />}
            <span className={textMuted}>{selectedAnalyse.source === 'voice' ? 'Vocal' : 'Photo'}</span>
            <span className={textMuted}>•</span>
            <span className={textMuted}>{lignes.length} postes</span>
            <span className={textMuted}>•</span>
            <span className="font-medium" style={{ color: couleur }}>{fmtCurrency.format(res?.totalHT || 0)}</span>
          </div>
        </div>

        {/* Lines */}
        {lignes.length > 0 && (
          <div className={`rounded-xl border overflow-hidden mb-4 ${cardBg}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? 'bg-slate-700/50' : 'bg-slate-50'}>
                  <th className={`text-left px-3 py-2 text-xs ${textMuted}`}>Désignation</th>
                  <th className={`text-right px-2 py-2 text-xs ${textMuted}`}>Qté</th>
                  <th className={`text-center px-2 py-2 text-xs ${textMuted}`}>Unité</th>
                  <th className={`text-right px-3 py-2 text-xs ${textMuted}`}>Total HT</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l, i) => (
                  <tr key={l.id || i} className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                    <td className={`px-3 py-2 ${textPrimary}`}>{l.designation}</td>
                    <td className={`px-2 py-2 text-right ${textMuted}`}>{l.quantite}</td>
                    <td className={`px-2 py-2 text-center ${textMuted}`}>{l.unite}</td>
                    <td className={`px-3 py-2 text-right font-medium ${textPrimary}`}>{fmtCurrency.format(l.quantite * l.prixUnitaire)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleDeleteAnalyse(selectedAnalyse.id)}
            className={`px-4 py-2.5 rounded-lg text-sm text-red-500 ${isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}`}
          >
            <Trash2 size={14} className="inline mr-1" />
            Supprimer
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

  // ---- CONVERT MODAL ----
  const renderConvertModal = () => {
    if (!showConvertModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className={`w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 ${isDark ? 'bg-slate-800' : 'bg-white'} max-h-[80vh] overflow-y-auto`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-bold ${textPrimary}`}>Créer le devis</h3>
            <button onClick={() => setShowConvertModal(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
              <X size={18} className={textMuted} />
            </button>
          </div>

          {/* Client */}
          <div className="mb-4">
            <label className={`text-xs font-medium mb-1 block ${textMuted}`}>Client (optionnel)</label>
            <select
              value={convertClient}
              onChange={e => setConvertClient(e.target.value)}
              className={`w-full rounded-lg border p-2.5 text-sm ${inputCls}`}
            >
              <option value="">— Sélectionner plus tard —</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.prenom ? `${c.prenom} ${c.nom}` : c.nom} {c.entreprise ? `(${c.entreprise})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* TVA */}
          <div className="mb-4">
            <label className={`text-xs font-medium mb-1 block ${textMuted}`}>TVA</label>
            <div className="flex gap-2">
              {[20, 10, 5.5, 0].map(rate => (
                <button
                  key={rate}
                  onClick={() => setConvertTva(rate)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    convertTva === rate ? 'text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                  }`}
                  style={convertTva === rate ? { backgroundColor: couleur } : {}}
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className={`text-xs font-medium mb-1 block ${textMuted}`}>Notes</label>
            <textarea
              value={convertNotes}
              onChange={e => setConvertNotes(e.target.value)}
              rows={2}
              placeholder="Conditions particulières..."
              className={`w-full rounded-lg border p-2.5 text-sm resize-none ${inputCls}`}
            />
          </div>

          {/* Total */}
          <div className={`rounded-lg p-3 mb-4 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${textMuted}`}>Total HT</span>
              <span className="text-lg font-bold" style={{ color: couleur }}>
                {fmtCurrency.format(editableTotalHT || analyseResult?.totalHT || 0)}
              </span>
            </div>
          </div>

          <button
            onClick={handleConfirmCreateDevis}
            className="w-full py-3 rounded-xl text-white font-semibold transition-all hover:shadow-lg flex items-center justify-center gap-2"
            style={{ backgroundColor: couleur }}
          >
            <FileText size={18} />
            Confirmer et créer le devis
          </button>
        </div>
      </div>
    );
  };

  // ===========================================================================
  // MAIN RENDER
  // ===========================================================================

  return (
    <div className={`min-h-screen pb-24 ${pageBg}`}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {view === 'list' && renderListView()}
        {view === 'new' && renderNewView()}
        {view === 'detail' && renderDetailView()}
      </div>
      {renderConvertModal()}
    </div>
  );
}
