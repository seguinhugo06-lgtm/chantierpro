import React, { useRef, useState } from 'react';
import {
  Mic, MicOff, Camera, Upload, X, AlertCircle, Sparkles, ArrowRight, Edit3,
} from 'lucide-react';
import IAQuickTemplates from './IAQuickTemplates';

/**
 * IAInputStep — Step 1 of analysis: voice, text, or photo input
 */
export default function IAInputStep({
  // Voice
  transcript,
  setTranscript,
  interimText,
  setInterimText,
  isListening,
  isSupported,
  voiceError,
  toggleListening,
  // Text
  manualText,
  setManualText,
  // Photo
  file,
  setFile,
  preview,
  setPreview,
  photoDescription,
  setPhotoDescription,
  // Tab
  activeTab,
  setActiveTab,
  // Template
  selectedTemplate,
  onTemplateSelect,
  // Actions
  onAnalyse,
  onBack,
  // Theme
  isDark = false,
  couleur = '#f97316',
}) {
  const fileInputRef = useRef(null);
  const [showValidationHint, setShowValidationHint] = useState(false);

  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const inputCls = isDark
    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
    : 'bg-white border-slate-300 text-slate-900';
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';

  const currentText = activeTab === 'voice'
    ? (transcript || manualText)
    : activeTab === 'text'
      ? manualText
      : photoDescription;

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith('image/')) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleAnalyseClick = () => {
    if (currentText.length < 10) {
      setShowValidationHint(true);
      return;
    }
    setShowValidationHint(false);
    onAnalyse();
  };

  // Tab config
  const tabs = [
    { id: 'voice', label: 'Voix', icon: Mic },
    { id: 'text', label: 'Texte', icon: Edit3 },
    { id: 'photo', label: 'Photo', icon: Camera },
  ];

  return (
    <div>
      {/* Tabs */}
      <div className={`flex border-b mb-5 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === tab.id ? 'border-current' : 'border-transparent'
            } ${activeTab === tab.id ? '' : textMuted}`}
            style={activeTab === tab.id ? { color: couleur, borderColor: couleur } : {}}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== VOICE TAB ===== */}
      {activeTab === 'voice' && (
        <div className="flex flex-col items-center">
          {isSupported ? (
            <>
              <button
                onClick={toggleListening}
                className={`w-24 h-24 rounded-full flex items-center justify-center mb-3 transition-all shadow-lg ${
                  isListening ? 'animate-pulse' : 'hover:scale-105'
                }`}
                style={{
                  backgroundColor: isListening ? '#EF4444' : couleur,
                  boxShadow: isListening ? '0 0 0 10px rgba(239,68,68,0.15), 0 0 0 20px rgba(239,68,68,0.08)' : `0 8px 25px ${couleur}40`,
                }}
              >
                {isListening ? <MicOff size={36} className="text-white" /> : <Mic size={36} className="text-white" />}
              </button>
              <p className={`text-sm mb-4 ${isListening ? 'text-red-500 font-medium' : textMuted}`}>
                {isListening ? 'En écoute... appuyez pour arrêter' : 'Appuyez pour dicter'}
              </p>
              {/* Animated bars when listening */}
              {isListening && (
                <div className="flex items-end gap-1 h-6 mb-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className="w-1 rounded-full animate-pulse"
                      style={{
                        backgroundColor: '#EF4444',
                        height: `${8 + Math.random() * 16}px`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: `${0.4 + Math.random() * 0.3}s`,
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className={`w-full p-3 rounded-lg mb-4 text-xs ${isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
              <AlertCircle size={14} className="inline mr-1" />
              La saisie vocale n'est pas disponible. Utilisez l'onglet Texte.
            </div>
          )}

          {voiceError && (
            <div className={`w-full p-3 rounded-lg mb-4 text-xs ${isDark ? 'bg-red-500/15 text-red-300' : 'bg-red-50 text-red-700'}`}>
              <AlertCircle size={14} className="inline mr-1" />
              {voiceError}
            </div>
          )}

          {/* Transcript */}
          {(transcript || interimText) && (
            <div className={`w-full rounded-xl border p-4 mb-4 min-h-[80px] ${cardBg}`}>
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

          {/* Manual fallback */}
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
              className={`w-full rounded-xl border p-3 text-sm resize-none ${inputCls} focus:outline-none focus:ring-2`}
              style={{ '--tw-ring-color': couleur }}
            />
            <p className={`text-[11px] mt-1 ${textMuted}`}>
              {(transcript || manualText).length} caractères
            </p>
          </div>
        </div>
      )}

      {/* ===== TEXT TAB ===== */}
      {activeTab === 'text' && (
        <div className="w-full mb-4">
          <textarea
            value={manualText}
            onChange={e => setManualText(e.target.value)}
            placeholder="Décrivez les travaux en détail...&#10;&#10;Ex : Rénovation complète salle de bain 8m². Remplacement baignoire par douche italienne, pose carrelage sol 60×60 et faïence murale, installation meuble vasque double, WC suspendu, sèche-serviettes électrique..."
            rows={6}
            className={`w-full rounded-xl border p-4 text-sm resize-none ${inputCls} focus:outline-none focus:ring-2`}
            style={{ '--tw-ring-color': couleur }}
            autoFocus
          />
          <div className="flex items-center justify-between mt-1.5">
            <p className={`text-[11px] ${textMuted}`}>
              {manualText.length} caractères {manualText.length < 10 && manualText.length > 0 && '· minimum 10'}
            </p>
            {manualText.length > 0 && (
              <button onClick={() => setManualText('')} className={`text-[11px] ${textMuted} hover:text-red-500`}>
                Effacer
              </button>
            )}
          </div>
        </div>
      )}

      {/* ===== PHOTO TAB ===== */}
      {activeTab === 'photo' && (
        <div className="mb-4">
          {!preview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all hover:border-current ${
                isDark ? 'border-slate-600 hover:bg-slate-800/50' : 'border-slate-300 hover:bg-slate-50'
              }`}
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
            className={`w-full rounded-xl border p-3 text-sm resize-none mt-4 ${inputCls} focus:outline-none focus:ring-2`}
            style={{ '--tw-ring-color': couleur }}
          />
        </div>
      )}

      {/* Quick templates */}
      <div className="mb-4">
        <IAQuickTemplates
          onSelect={(text, id) => {
            setManualText(text);
            if (activeTab === 'photo') setPhotoDescription(text);
            onTemplateSelect(text, id);
          }}
          isDark={isDark}
          couleur={couleur}
          selected={selectedTemplate}
        />
      </div>

      {/* Validation hint */}
      {showValidationHint && currentText.length < 10 && (
        <p className={`text-xs mb-3 ${isDark ? 'text-red-400' : 'text-red-500'}`}>
          Décrivez les travaux pour lancer l'analyse (minimum 10 caractères)
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onBack}
          className={`shrink-0 px-3 sm:px-4 py-2.5 rounded-xl text-sm ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <span className="sm:hidden">←</span>
          <span className="hidden sm:inline">← Retour</span>
        </button>
        <button
          onClick={handleAnalyseClick}
          className={`flex-1 flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-white font-semibold transition-all hover:shadow-lg ${
            currentText.length < 10 ? 'opacity-40 cursor-not-allowed' : ''
          }`}
          style={{ backgroundColor: couleur }}
        >
          <Sparkles size={18} className="shrink-0" />
          Analyser
          <ArrowRight size={16} className="shrink-0" />
        </button>
      </div>
    </div>
  );
}
