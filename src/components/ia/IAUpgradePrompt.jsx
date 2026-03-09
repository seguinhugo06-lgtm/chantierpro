import React from 'react';
import { Sparkles, ArrowUpRight, CheckCircle } from 'lucide-react';
import { useSubscriptionStore } from '../../stores/subscriptionStore';

/**
 * IAUpgradePrompt — Inline card when IA analysis limit is reached
 * Non-blocking: history remains accessible, just can't create new analyses.
 *
 * @param {boolean} isDark
 * @param {string} couleur
 */
export default function IAUpgradePrompt({ isDark = false, couleur = '#f97316' }) {
  const openUpgradeModal = useSubscriptionStore((s) => s.openUpgradeModal);

  const advantages = [
    '5 analyses IA par mois, renouvelées',
    'Devis & factures illimités',
    'Signatures électroniques',
    'Support prioritaire',
  ];

  return (
    <div className={`rounded-2xl border-2 p-6 text-center ${
      isDark ? 'border-slate-600 bg-slate-800/80' : 'border-slate-200 bg-white'
    }`}>
      {/* Icon */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: `linear-gradient(135deg, ${couleur}20, ${couleur}40)` }}
      >
        <Sparkles className="w-8 h-8" style={{ color: couleur }} />
      </div>

      {/* Title */}
      <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
        Vous avez utilisé vos 5 analyses IA
      </h3>
      <p className={`text-sm mb-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        Passez au plan Pro pour continuer à générer des devis avec l'IA
      </p>

      {/* Advantages */}
      <div className={`rounded-xl p-4 mb-5 text-left ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
        <ul className="space-y-2">
          {advantages.map((adv, i) => (
            <li key={i} className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <CheckCircle size={14} className="text-emerald-500 shrink-0" />
              {adv}
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <button
        onClick={() => openUpgradeModal('ia_devis')}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-semibold transition-all hover:shadow-lg hover:scale-[1.02]"
        style={{ backgroundColor: couleur }}
      >
        <ArrowUpRight size={18} />
        Découvrir le plan Pro
      </button>

      {/* Note */}
      <p className={`text-xs mt-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        Vos analyses existantes restent accessibles
      </p>
    </div>
  );
}
