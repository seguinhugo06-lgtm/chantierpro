import React, { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';

/**
 * IAAnalysisStep — Step 2: Loading animation with progressive labels + cancel
 *
 * @param {string} progressLabel - Current progress message
 * @param {function} [onCancel] - Callback to cancel the analysis
 * @param {boolean} isDark
 * @param {string} couleur
 */
export default function IAAnalysisStep({ progressLabel = 'Analyse en cours...', onCancel, isDark = false, couleur = '#f97316' }) {
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';

  // Elapsed timer
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmtTime = elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;

  return (
    <div className="flex flex-col items-center justify-center py-16">
      {/* Animated rings */}
      <div className="relative w-20 h-20 mb-6">
        <div
          className="absolute inset-0 rounded-full animate-ping opacity-15"
          style={{ backgroundColor: couleur }}
        />
        <div
          className="absolute inset-2 rounded-full animate-ping opacity-10"
          style={{ backgroundColor: couleur, animationDelay: '0.3s' }}
        />
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center relative"
          style={{ backgroundColor: couleur }}
        >
          <Sparkles
            size={32}
            className="text-white"
            style={{ animation: 'spin 3s linear infinite' }}
          />
        </div>
      </div>

      {/* Label */}
      <p className={`text-sm font-medium mb-1 ${textPrimary}`}>{progressLabel}</p>
      <p className={`text-xs ${textMuted}`}>{fmtTime}</p>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5 mt-4">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full animate-pulse"
            style={{
              backgroundColor: couleur,
              opacity: 0.4 + i * 0.2,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      {/* Cancel button */}
      {onCancel && (
        <button
          onClick={onCancel}
          className={`mt-6 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
            isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          }`}
        >
          <X size={14} />
          Annuler
        </button>
      )}
    </div>
  );
}
