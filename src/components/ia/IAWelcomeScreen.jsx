import React from 'react';
import { Sparkles, Mic } from 'lucide-react';
import IAUsageCounter from './IAUsageCounter';
import IAQuickTemplates from './IAQuickTemplates';

/**
 * IAWelcomeScreen — Empty state when no analyses exist yet
 *
 * @param {function} onNewAnalysis - Start a new analysis
 * @param {function} onTemplateSelect - Select a quick template (text, templateId)
 * @param {object} availability - { allowed, used, limit, remaining }
 * @param {boolean} isLifetime
 * @param {boolean} isDark
 * @param {string} couleur
 */
export default function IAWelcomeScreen({
  onNewAnalysis,
  onTemplateSelect,
  availability,
  isLifetime = true,
  isDark = false,
  couleur = '#f97316',
}) {
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {/* Icon */}
      <div
        className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
        style={{ background: `linear-gradient(135deg, ${couleur}15, ${couleur}30)` }}
      >
        <Sparkles className="w-12 h-12" style={{ color: couleur }} />
      </div>

      {/* Title */}
      <h1 className={`text-2xl font-bold mb-2 ${textPrimary}`}>Devis IA</h1>
      <p className={`text-sm text-center max-w-md mb-5 ${textMuted}`}>
        Décrivez vos travaux à voix haute ou par écrit, l'IA génère un devis détaillé avec les prix du marché en quelques secondes.
      </p>

      {/* Usage counter */}
      <div className="mb-6">
        <IAUsageCounter
          used={availability.used}
          limit={availability.limit}
          isLifetime={isLifetime}
          isDark={isDark}
          couleur={couleur}
        />
      </div>

      {/* CTA */}
      <button
        onClick={onNewAnalysis}
        disabled={!availability.allowed}
        className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 mb-8"
        style={{ backgroundColor: couleur }}
      >
        <Mic className="w-5 h-5" />
        Créer mon premier devis IA
      </button>

      {/* Quick templates */}
      {availability.allowed && (
        <div className="w-full max-w-md">
          <IAQuickTemplates
            onSelect={onTemplateSelect}
            isDark={isDark}
            couleur={couleur}
          />
        </div>
      )}
    </div>
  );
}
