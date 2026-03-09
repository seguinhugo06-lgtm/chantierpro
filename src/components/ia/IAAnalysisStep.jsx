import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * IAAnalysisStep — Step 2: Loading animation with progressive labels
 *
 * @param {string} progressLabel - Current progress message
 * @param {boolean} isDark
 * @param {string} couleur
 */
export default function IAAnalysisStep({ progressLabel = 'Analyse en cours...', isDark = false, couleur = '#f97316' }) {
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';

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
      <p className={`text-sm font-medium mb-2 ${textPrimary}`}>{progressLabel}</p>
      <p className={`text-xs ${textMuted}`}>Quelques secondes...</p>

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
    </div>
  );
}
