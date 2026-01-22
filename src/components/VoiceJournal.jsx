import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Square, X, Check, Clock, MapPin, Building2, Package, AlertTriangle, Loader2, Send } from 'lucide-react';

/**
 * VoiceJournal - Voice note capture for field workers
 * Features:
 * - One-tap recording
 * - Timer display
 * - Auto-link to current chantier
 * - Transcription preview (placeholder - would use Whisper in production)
 */
export default function VoiceJournal({
  isOpen,
  onClose,
  onSave,
  currentChantier,
  chantiers = [],
  isDark = false,
  couleur = '#f97316'
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [selectedChantier, setSelectedChantier] = useState(currentChantier || '');
  const [extractedData, setExtractedData] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // Theme classes
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200';

  // Format duration as MM:SS
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        simulateTranscription();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Impossible d\'acceder au microphone. Verifiez les permissions.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  // Simulate transcription (in production, would use Whisper API)
  const simulateTranscription = () => {
    setIsTranscribing(true);

    // Simulate processing delay
    setTimeout(() => {
      // Demo transcription
      const demoTranscription = "Aujourd'hui j'ai passe 3 heures sur le chantier Dupont. " +
        "J'ai pose le receveur de douche et tire les evacuations. " +
        "J'ai utilise 2 metres de PER 16 et 3 coudes. " +
        "Probleme: la chape n'est pas seche, il faudra revenir jeudi.";

      setTranscription(demoTranscription);

      // Extract structured data (in production, would use Claude API)
      setExtractedData({
        heures: 3,
        materiaux: [
          { nom: 'PER 16mm', quantite: 2, unite: 'm' },
          { nom: 'Coude PER 16', quantite: 3, unite: 'pcs' }
        ],
        travaux: 'Pose receveur douche + evacuations',
        probleme: 'Chape non seche - reporter a jeudi',
        prochainRDV: 'Jeudi'
      });

      setIsTranscribing(false);
    }, 2000);
  };

  // Handle save
  const handleSave = () => {
    onSave?.({
      chantierId: selectedChantier,
      transcription,
      extractedData,
      audioBlob,
      duration,
      timestamp: new Date().toISOString()
    });
    handleClose();
  };

  // Handle close
  const handleClose = () => {
    stopRecording();
    setTranscription('');
    setExtractedData(null);
    setAudioBlob(null);
    setDuration(0);
    onClose();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  // Set default chantier
  useEffect(() => {
    if (currentChantier) {
      setSelectedChantier(currentChantier);
    }
  }, [currentChantier]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div
        className={`w-full sm:max-w-lg ${cardBg} rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 pt-6 pb-4 flex items-center justify-between"
          style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Mic size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Journal vocal</h2>
              <p className="text-white/80 text-sm">
                {isRecording ? 'Enregistrement...' : audioBlob ? 'Transcription' : 'Pret a enregistrer'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Chantier selector */}
          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${textPrimary}`}>
              <Building2 size={14} style={{ color: couleur }} />
              Chantier associe
            </label>
            <select
              value={selectedChantier}
              onChange={e => setSelectedChantier(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
            >
              <option value="">Selectionner un chantier...</option>
              {chantiers.map(c => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>

          {/* Recording area */}
          {!audioBlob ? (
            <div className="text-center py-8">
              {/* Timer */}
              <div className={`text-4xl font-mono font-bold mb-6 ${isRecording ? 'text-red-500' : textMuted}`}>
                {formatDuration(duration)}
              </div>

              {/* Record button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'hover:scale-110'
                }`}
                style={!isRecording ? { backgroundColor: couleur } : {}}
              >
                {isRecording ? (
                  <Square size={32} className="text-white" fill="white" />
                ) : (
                  <Mic size={32} className="text-white" />
                )}
              </button>

              <p className={`mt-4 text-sm ${textMuted}`}>
                {isRecording ? 'Appuyez pour arreter' : 'Appuyez pour enregistrer'}
              </p>

              {/* Tips */}
              <div className={`mt-6 p-4 rounded-xl text-left text-sm ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <p className={`font-medium mb-2 ${textPrimary}`}>Conseils pour de meilleurs resultats :</p>
                <ul className={`space-y-1 ${textMuted}`}>
                  <li>• Mentionnez les heures travaillees</li>
                  <li>• Listez les materiaux utilises avec quantites</li>
                  <li>• Decrivez les problemes rencontres</li>
                  <li>• Indiquez les prochaines etapes</li>
                </ul>
              </div>
            </div>
          ) : (
            /* Transcription result */
            <div className="space-y-4">
              {isTranscribing ? (
                <div className="text-center py-8">
                  <Loader2 size={40} className="mx-auto animate-spin" style={{ color: couleur }} />
                  <p className={`mt-4 ${textMuted}`}>Transcription en cours...</p>
                </div>
              ) : (
                <>
                  {/* Transcription text */}
                  <div>
                    <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${textPrimary}`}>
                      <Clock size={14} style={{ color: couleur }} />
                      Transcription ({formatDuration(duration)})
                    </label>
                    <textarea
                      value={transcription}
                      onChange={e => setTranscription(e.target.value)}
                      rows={3}
                      className={`w-full px-4 py-3 border rounded-xl resize-none ${inputBg}`}
                    />
                  </div>

                  {/* Extracted data */}
                  {extractedData && (
                    <div className={`p-4 rounded-xl border-2 ${isDark ? 'border-emerald-700 bg-emerald-900/20' : 'border-emerald-200 bg-emerald-50'}`}>
                      <p className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                        <Check size={16} /> Donnees extraites automatiquement
                      </p>

                      <div className="space-y-2 text-sm">
                        {extractedData.heures && (
                          <div className="flex items-center gap-2">
                            <Clock size={14} className={textMuted} />
                            <span className={textPrimary}><strong>{extractedData.heures}h</strong> de travail</span>
                          </div>
                        )}

                        {extractedData.materiaux?.length > 0 && (
                          <div className="flex items-start gap-2">
                            <Package size={14} className={`${textMuted} mt-0.5`} />
                            <div>
                              {extractedData.materiaux.map((m, i) => (
                                <span key={i} className={textPrimary}>
                                  {m.quantite} {m.unite} {m.nom}
                                  {i < extractedData.materiaux.length - 1 ? ', ' : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {extractedData.probleme && (
                          <div className="flex items-center gap-2">
                            <AlertTriangle size={14} className="text-amber-500" />
                            <span className={textPrimary}>{extractedData.probleme}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Re-record button */}
                  <button
                    onClick={() => {
                      setAudioBlob(null);
                      setTranscription('');
                      setExtractedData(null);
                      setDuration(0);
                    }}
                    className={`w-full py-2 text-sm font-medium rounded-xl ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    Recommencer l'enregistrement
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {audioBlob && !isTranscribing && (
          <div className={`px-6 py-4 border-t ${borderColor} flex gap-3`}>
            <button
              onClick={handleClose}
              className={`flex-1 py-3 rounded-xl font-medium ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedChantier}
              className="flex-1 py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: couleur }}
            >
              <Send size={18} />
              Enregistrer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * VoiceJournalFAB - Floating action button for quick voice recording
 */
export function VoiceJournalFAB({ onClick, isDark, couleur = '#f97316' }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-40"
      style={{ backgroundColor: couleur }}
      title="Note vocale"
    >
      <Mic size={24} className="text-white" />
    </button>
  );
}
