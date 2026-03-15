import React from 'react';
import { Mic, Square, AlertCircle } from 'lucide-react';

/**
 * Composant de capture vocale avec visualisation niveau audio.
 */
export default function VoiceRecorder({
  isRecording, duration, audioLevel, error,
  onStart, onStop,
  isDark, couleur,
}) {
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  const formatDuration = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Audio level bars
  const bars = 12;
  const activeBars = Math.round(audioLevel * bars);

  return (
    <div className={`rounded-2xl border p-6 sm:p-8 text-center ${cardBg}`}>
      {/* Microphone button */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={isRecording ? onStop : onStart}
          className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30'
              : 'text-white hover:shadow-lg hover:scale-105'
          }`}
          style={!isRecording ? { background: couleur, boxShadow: `0 4px 20px ${couleur}40` } : {}}
          aria-label={isRecording ? 'Arrêter l\'enregistrement' : 'Commencer l\'enregistrement'}
        >
          {isRecording ? (
            <Square size={28} fill="white" />
          ) : (
            <Mic size={32} />
          )}
          {/* Pulse animation when recording */}
          {isRecording && (
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20" />
          )}
        </button>

        {/* Duration */}
        {isRecording && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl font-mono font-bold" style={{ color: couleur }}>
              {formatDuration(duration)}
            </span>

            {/* Audio level bars */}
            <div className="flex items-end gap-0.5 h-8">
              {Array.from({ length: bars }).map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-full transition-all duration-75"
                  style={{
                    height: i < activeBars ? `${12 + (i / bars) * 20}px` : '4px',
                    background: i < activeBars ? couleur : (isDark ? '#475569' : '#cbd5e1'),
                    opacity: i < activeBars ? 0.7 + (i / bars) * 0.3 : 0.3,
                  }}
                />
              ))}
            </div>

            <span className={`text-xs ${textMuted}`}>Enregistrement en cours…</span>
          </div>
        )}

        {!isRecording && !error && (
          <div className="space-y-1">
            <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
              Appuyez pour dicter votre devis
            </p>
            <p className={`text-xs ${textMuted}`}>
              Décrivez les matériaux, quantités, prix et main d'œuvre
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
