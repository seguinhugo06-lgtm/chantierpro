import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ArrowLeft, ArrowRight, Mic, Type, Check, Loader2,
  Sparkles, HelpCircle, MapPin, UserPlus, ChevronDown,
} from 'lucide-react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { transcribeAudio, analyzeTranscription, refineLines } from '../services/devisIAService';
import { cleanTranscription, detectLocation } from '../lib/voice-cleanup';
import { formatRateRange } from '../lib/geo-rates';
import VoiceRecorder from './devis-ia/VoiceRecorder';
import TranscriptionReview from './devis-ia/TranscriptionReview';
import ResultsEditor from './devis-ia/ResultsEditor';
import AffinageChat from './devis-ia/AffinageChat';
import VoiceGuide from './devis-ia/VoiceGuide';

/**
 * Page Devis IA — wizard 5 étapes pour créer un devis par dictée vocale.
 *
 * Étape 1: Capture (voix ou texte)
 * Étape 2: Validation transcription
 * Étape 3: Résultats IA + affinage chat
 * Étape 4: Finalisation (client, TVA, remise)
 * Étape 5: Terminé → créer devis
 */
export default function DevisIA({
  isDark,
  couleur = '#f97316',
  showToast,
  user,
  isDemo,
  clients = [],
  catalogue = [],
  addClient,
  addDevis,
  entreprise,
  setPage,
  supabase,
}) {
  // ── State ──────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [inputMode, setInputMode] = useState('voice'); // 'voice' | 'text'
  const [textInput, setTextInput] = useState('');
  const [showGuide, setShowGuide] = useState(() => {
    try { return !localStorage.getItem('batigesti_voice_guide_seen'); }
    catch { return true; }
  });

  // Transcription state
  const [rawTranscription, setRawTranscription] = useState('');
  const [cleanedTranscription, setCleanedTranscription] = useState('');
  const [corrections, setCorrections] = useState([]);
  const [detectedCity, setDetectedCity] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Analysis state
  const [analysis, setAnalysis] = useState(null);
  const [lines, setLines] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [summary, setSummary] = useState('');
  const [unrecognized, setUnrecognized] = useState([]);
  const [suggestedMemories, setSuggestedMemories] = useState([]);

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [isRefining, setIsRefining] = useState(false);

  // Finalization state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [tvaDefault, setTvaDefault] = useState(20);
  const [remise, setRemise] = useState(0);
  const [notes, setNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdDevisId, setCreatedDevisId] = useState(null);

  // Voice recorder hook
  const { isRecording, duration, audioLevel, audioBlob, error: recorderError, startRecording, stopRecording } = useVoiceRecorder();

  // ── Theme ──────────────────────────────────────────────────
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';

  // ── Steps definition ──────────────────────────────────────
  const steps = [
    { id: 1, label: 'Capture', icon: Mic },
    { id: 2, label: 'Validation', icon: Type },
    { id: 3, label: 'Résultats', icon: Sparkles },
    { id: 4, label: 'Finalisation', icon: Check },
    { id: 5, label: 'Terminé', icon: Check },
  ];

  // ── Handlers ──────────────────────────────────────────────

  // Auto-process audio when recording stops
  useEffect(() => {
    if (audioBlob && !isRecording && step === 1) {
      handleTranscribe(audioBlob);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob, isRecording]);

  const handleTranscribe = useCallback(async (blob) => {
    setIsTranscribing(true);
    try {
      const { text } = await transcribeAudio(supabase, blob, isDemo);
      setRawTranscription(text);
      const { cleaned, corrections: corr } = cleanTranscription(text);
      setCleanedTranscription(cleaned);
      setCorrections(corr);
      setDetectedCity(detectLocation(text));
      setStep(2);
    } catch (err) {
      showToast?.('Erreur de transcription : ' + (err.message || 'Réessayez'), 'error');
    } finally {
      setIsTranscribing(false);
    }
  }, [supabase, isDemo, showToast]);

  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim()) return;
    setRawTranscription(textInput);
    const { cleaned, corrections: corr } = cleanTranscription(textInput);
    setCleanedTranscription(cleaned);
    setCorrections(corr);
    setDetectedCity(detectLocation(textInput));
    setStep(2);
  }, [textInput]);

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeTranscription(supabase, {
        text: cleanedTranscription,
        catalogue,
        memories: [], // TODO: charger depuis ai_memory
        region: detectedCity || entreprise?.ville,
        entreprise,
      }, isDemo);

      setAnalysis(result);
      setLines(result.lines || []);
      setConfidence(result.confidence || 0);
      setSummary(result.summary || '');
      setUnrecognized(result.unrecognized || []);
      setSuggestedMemories(result.suggestedMemories || []);
      setStep(3);
    } catch (err) {
      showToast?.('Erreur d\'analyse : ' + (err.message || 'Réessayez'), 'error');
    } finally {
      setIsAnalyzing(false);
    }
  }, [supabase, cleanedTranscription, catalogue, detectedCity, entreprise, isDemo, showToast]);

  const handleUpdateLine = useCallback((id, updates) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  }, []);

  const handleRemoveLine = useCallback((id) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const handleDuplicateLine = useCallback((id) => {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx === -1) return prev;
      const clone = { ...prev[idx], id: `ia-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  }, []);

  const handleAddLine = useCallback(() => {
    setLines((prev) => [...prev, {
      id: `ia-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      designation: 'Nouveau poste',
      source: 'suggestion',
      catalogueId: null,
      qty: 1,
      unit: 'u',
      puHT: 0,
      totalHT: 0,
      confidence: 100,
      notes: '',
    }]);
  }, []);

  const handleChatMessage = useCallback(async (message) => {
    setChatMessages((prev) => [...prev, { role: 'user', content: message }]);
    setIsRefining(true);
    try {
      const result = await refineLines(supabase, { message, currentLines: lines }, isDemo);
      setLines(result.updatedLines || lines);
      setChatMessages((prev) => [...prev, { role: 'assistant', content: result.explanation || 'Modifications appliquées.' }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Erreur : ' + (err.message || 'Réessayez') }]);
    } finally {
      setIsRefining(false);
    }
  }, [supabase, lines, isDemo]);

  const handleCreateDevis = useCallback(async () => {
    if (!selectedClientId) {
      showToast?.('Veuillez sélectionner un client', 'error');
      return;
    }
    setIsCreating(true);
    try {
      // Convert IA lines to devis format
      const devisLignes = lines.map((l, i) => ({
        id: l.id,
        description: l.designation,
        quantite: l.qty,
        unite: l.unit,
        prixUnitaire: l.puHT,
        montant: l.totalHT,
        tva: tvaDefault,
        ordre: i,
      }));

      const totalHT = devisLignes.reduce((sum, l) => sum + (l.montant || 0), 0);
      const remiseAmount = totalHT * (remise / 100);
      const totalAfterRemise = totalHT - remiseAmount;
      const totalTVA = totalAfterRemise * (tvaDefault / 100);
      const totalTTC = totalAfterRemise + totalTVA;

      const newDevis = await addDevis({
        type: 'devis',
        clientId: selectedClientId,
        lignes: devisLignes,
        sections: [{ id: 'section-1', titre: summary || 'Devis IA', lignes: devisLignes }],
        remise,
        tvaDefaut: tvaDefault,
        totalHT,
        totalTTC,
        notes: notes || `Généré par IA — Confiance ${confidence}%`,
        statut: 'brouillon',
        date: new Date().toISOString().split('T')[0],
        validite: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        sourceIA: {
          rawTranscription,
          cleanedTranscription,
          confidence,
          analysisId: analysis?.id,
        },
      });

      setCreatedDevisId(newDevis?.id);
      setStep(5);
      showToast?.('Devis créé avec succès !', 'success');
    } catch (err) {
      showToast?.('Erreur lors de la création du devis', 'error');
    } finally {
      setIsCreating(false);
    }
  }, [selectedClientId, lines, tvaDefault, remise, notes, summary, confidence, rawTranscription, cleanedTranscription, analysis, addDevis, showToast]);

  const handleGuideClose = () => {
    setShowGuide(false);
    try { localStorage.setItem('batigesti_voice_guide_seen', '1'); } catch {}
  };

  // ── Computed ──────────────────────────────────────────────

  const totalHT = useMemo(() => lines.reduce((sum, l) => sum + (l.totalHT || 0), 0), [lines]);
  const totalTTC = useMemo(() => {
    const afterRemise = totalHT * (1 - remise / 100);
    return afterRemise * (1 + tvaDefault / 100);
  }, [totalHT, remise, tvaDefault]);

  const canGoNext = useMemo(() => {
    switch (step) {
      case 1: return !!rawTranscription || !!textInput.trim();
      case 2: return !!cleanedTranscription;
      case 3: return lines.length > 0;
      case 4: return !!selectedClientId;
      default: return false;
    }
  }, [step, rawTranscription, textInput, cleanedTranscription, lines, selectedClientId]);

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage?.('devis')}
            className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} transition-colors`}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
              <Sparkles size={22} style={{ color: couleur }} />
              Devis IA
            </h1>
            <p className={`text-xs sm:text-sm ${textMuted}`}>
              Dictez, l'IA génère votre devis
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowGuide(true)}
          className={`p-2 rounded-xl ${textMuted} hover:opacity-70`}
          title="Guide de dictée"
        >
          <HelpCircle size={20} />
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1">
        {steps.map((s, i) => {
          const isActive = s.id === step;
          const isCompleted = s.id < step;
          const Icon = s.icon;
          return (
            <React.Fragment key={s.id}>
              {i > 0 && (
                <div
                  className="flex-shrink-0 w-4 sm:w-8 h-0.5 rounded"
                  style={{ background: isCompleted ? couleur : (isDark ? '#475569' : '#cbd5e1') }}
                />
              )}
              <div className={`flex items-center gap-1.5 flex-shrink-0 px-2 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                isActive ? 'text-white' : isCompleted ? '' : textMuted
              }`}
                style={isActive ? { background: couleur } : isCompleted ? { color: couleur } : {}}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* ── STEP 1: Capture ── */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setInputMode('voice')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                inputMode === 'voice' ? 'text-white' : `${cardBg} border`
              }`}
              style={inputMode === 'voice' ? { background: couleur } : {}}
            >
              <Mic size={16} />
              Voix
            </button>
            <button
              onClick={() => setInputMode('text')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                inputMode === 'text' ? 'text-white' : `${cardBg} border`
              }`}
              style={inputMode === 'text' ? { background: couleur } : {}}
            >
              <Type size={16} />
              Texte
            </button>
          </div>

          {inputMode === 'voice' ? (
            <div className="space-y-4">
              <VoiceRecorder
                isRecording={isRecording}
                duration={duration}
                audioLevel={audioLevel}
                error={recorderError}
                onStart={startRecording}
                onStop={stopRecording}
                isDark={isDark}
                couleur={couleur}
              />
              {isTranscribing && (
                <div className={`flex items-center justify-center gap-2 p-4 rounded-xl ${cardBg} border`}>
                  <Loader2 size={18} className="animate-spin" style={{ color: couleur }} />
                  <span className={`text-sm ${textSecondary}`}>Transcription en cours…</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={6}
                placeholder="Décrivez votre devis ici…&#10;Ex: Pose 2 prises Legrand, disjoncteur C10, 2h main d'œuvre à 45€/h"
                className={`w-full p-4 rounded-xl border text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 ${inputBg}`}
                style={{ '--tw-ring-color': couleur }}
              />
              <button
                onClick={handleTextSubmit}
                disabled={!textInput.trim()}
                className="w-full py-3 rounded-xl text-white font-medium disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                style={{ background: couleur }}
              >
                <ArrowRight size={18} />
                Continuer
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: Validation transcription ── */}
      {step === 2 && (
        <div className="space-y-4">
          <TranscriptionReview
            rawText={rawTranscription}
            cleanedText={cleanedTranscription}
            corrections={corrections}
            detectedCity={detectedCity}
            onUpdate={(text) => setCleanedTranscription(text)}
            isDark={isDark}
            couleur={couleur}
          />

          {/* Regional rate info */}
          {detectedCity && (
            <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${cardBg} border`}>
              <MapPin size={16} style={{ color: couleur }} />
              <span>Tarifs MO : <strong>{formatRateRange(detectedCity)}</strong></span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
            >
              <ArrowLeft size={16} className="inline mr-1" />
              Retour
            </button>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !cleanedTranscription}
              className="flex-1 py-2.5 rounded-xl text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: couleur }}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Analyse en cours…
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Analyser avec l'IA
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Résultats + affinage ── */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className={`flex items-center justify-between p-3 rounded-xl ${cardBg} border`}>
            <div>
              <p className="text-sm font-medium">{summary}</p>
              <p className={`text-xs ${textMuted}`}>
                Confiance globale : <span style={{ color: couleur }}>{confidence}%</span>
              </p>
            </div>
            {detectedCity && (
              <span className="text-xs px-2 py-1 rounded-lg" style={{ background: `${couleur}15`, color: couleur }}>
                📍 {detectedCity}
              </span>
            )}
          </div>

          {/* Unrecognized items */}
          {unrecognized.length > 0 && (
            <div className={`p-3 rounded-xl text-xs ${isDark ? 'bg-yellow-900/20 border-yellow-700/30' : 'bg-yellow-50 border-yellow-200'} border`}>
              <span className="font-medium">Non reconnu : </span>
              {unrecognized.join(', ')}
            </div>
          )}

          {/* Results table */}
          <ResultsEditor
            lines={lines}
            onUpdateLine={handleUpdateLine}
            onRemoveLine={handleRemoveLine}
            onDuplicateLine={handleDuplicateLine}
            onAddLine={handleAddLine}
            isDark={isDark}
            couleur={couleur}
          />

          {/* Chat */}
          <AffinageChat
            onSendMessage={handleChatMessage}
            isLoading={isRefining}
            messages={chatMessages}
            isDark={isDark}
            couleur={couleur}
          />

          {/* Navigation */}
          <div className="flex gap-2">
            <button
              onClick={() => setStep(2)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
            >
              <ArrowLeft size={16} className="inline mr-1" />
              Retour
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={lines.length === 0}
              className="flex-1 py-2.5 rounded-xl text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: couleur }}
            >
              Finaliser
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Finalisation ── */}
      {step === 4 && (
        <div className="space-y-4">
          {/* Client selection */}
          <div className={`rounded-2xl border p-4 sm:p-5 space-y-4 ${cardBg}`}>
            <h3 className="font-semibold text-sm">Client</h3>
            <div className="relative">
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className={`w-full p-3 rounded-xl border text-sm appearance-none pr-10 ${inputBg}`}
              >
                <option value="">Sélectionner un client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom || c.prenom ? `${c.nom || ''} ${c.prenom || ''}`.trim() : c.email || 'Client sans nom'}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${textMuted}`} />
            </div>
          </div>

          {/* TVA + Remise */}
          <div className={`rounded-2xl border p-4 sm:p-5 space-y-4 ${cardBg}`}>
            <h3 className="font-semibold text-sm">Paramètres</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`text-xs ${textMuted} block mb-1`}>TVA (%)</label>
                <div className="flex gap-1">
                  {[20, 10, 5.5, 0].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTvaDefault(t)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                        tvaDefault === t ? 'text-white' : isDark ? 'bg-slate-700' : 'bg-slate-100'
                      }`}
                      style={tvaDefault === t ? { background: couleur } : {}}
                    >
                      {t}%
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={`text-xs ${textMuted} block mb-1`}>Remise (%)</label>
                <input
                  type="number"
                  value={remise}
                  onChange={(e) => setRemise(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                  className={`w-full p-2 rounded-lg border text-sm ${inputBg}`}
                  min="0"
                  max="100"
                  step="0.5"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className={`rounded-2xl border p-4 sm:p-5 space-y-2 ${cardBg}`}>
            <h3 className="font-semibold text-sm">Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Notes internes ou conditions particulières…"
              className={`w-full p-3 rounded-xl border text-sm resize-none ${inputBg}`}
            />
          </div>

          {/* Totals */}
          <div className={`rounded-2xl border p-4 sm:p-5 ${cardBg}`}>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className={textMuted}>Total HT</span>
                <span>{totalHT.toFixed(2)} €</span>
              </div>
              {remise > 0 && (
                <div className="flex justify-between text-sm">
                  <span className={textMuted}>Remise ({remise}%)</span>
                  <span className="text-red-500">-{(totalHT * remise / 100).toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className={textMuted}>TVA ({tvaDefault}%)</span>
                <span>{(totalHT * (1 - remise / 100) * tvaDefault / 100).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t" style={{ borderColor: isDark ? '#475569' : '#e2e8f0' }}>
                <span>Total TTC</span>
                <span style={{ color: couleur }}>{totalTTC.toFixed(2)} €</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-2">
            <button
              onClick={() => setStep(3)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
            >
              <ArrowLeft size={16} className="inline mr-1" />
              Retour
            </button>
            <button
              onClick={handleCreateDevis}
              disabled={!selectedClientId || isCreating}
              className="flex-1 py-2.5 rounded-xl text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: couleur }}
            >
              {isCreating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Création…
                </>
              ) : (
                <>
                  <Check size={18} />
                  Créer le devis
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 5: Terminé ── */}
      {step === 5 && (
        <div className={`rounded-2xl border p-6 sm:p-10 text-center space-y-4 ${cardBg}`}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-white" style={{ background: couleur }}>
            <Check size={32} />
          </div>
          <h2 className="text-xl font-bold">Devis créé !</h2>
          <p className={`text-sm ${textMuted}`}>
            Votre devis a été généré en brouillon. Vous pouvez le modifier et l'envoyer à votre client.
          </p>

          {/* Suggested memories */}
          {suggestedMemories.length > 0 && (
            <div className={`text-left p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'} space-y-2`}>
              <p className="text-sm font-medium">💡 Mémoriser ces préférences ?</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestedMemories.map((mem, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ background: `${couleur}15`, color: couleur }}
                    title={JSON.stringify(mem.value)}
                  >
                    {mem.key.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
              <p className={`text-xs ${textMuted}`}>Les préférences seront utilisées pour les prochains devis IA</p>
            </div>
          )}

          <div className="flex gap-2 justify-center pt-2">
            <button
              onClick={() => {
                setPage?.('devis');
                // Sélectionner le devis créé si possible
              }}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
            >
              Voir mes devis
            </button>
            <button
              onClick={() => {
                // Reset tout pour un nouveau devis
                setStep(1);
                setRawTranscription('');
                setCleanedTranscription('');
                setCorrections([]);
                setDetectedCity(null);
                setAnalysis(null);
                setLines([]);
                setChatMessages([]);
                setSelectedClientId('');
                setRemise(0);
                setNotes('');
                setTextInput('');
              }}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ background: couleur }}
            >
              Nouveau devis IA
            </button>
          </div>
        </div>
      )}

      {/* Voice Guide Modal */}
      <VoiceGuide
        isOpen={showGuide}
        onClose={handleGuideClose}
        isDark={isDark}
        couleur={couleur}
      />
    </div>
  );
}
