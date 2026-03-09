import React, { useEffect, useState } from 'react';
import { CheckCircle, FileText, Sparkles, ArrowRight } from 'lucide-react';

const fmtCurrency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

/**
 * IASuccessStep — Step 5: Animated success screen after devis creation
 */
export default function IASuccessStep({
  devisNumero = '',
  clientName = '',
  lineCount = 0,
  totalTTC = 0,
  onViewDevis,
  onNewAnalysis,
  isDark = false,
  couleur = '#f97316',
}) {
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';

  // Animate in
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`flex flex-col items-center text-center transition-all duration-500 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* Animated checkmark */}
      <div
        className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-transform duration-500 ${show ? 'scale-100' : 'scale-50'}`}
        style={{ backgroundColor: `${couleur}15` }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${couleur}25` }}
        >
          <CheckCircle size={32} style={{ color: couleur }} />
        </div>
      </div>

      {/* Title */}
      <h2 className={`text-2xl font-bold mb-1 ${textPrimary}`}>Devis créé !</h2>
      <p className={`text-sm mb-6 ${textMuted}`}>Votre devis a été généré avec succès</p>

      {/* Summary card */}
      <div className={`w-full rounded-xl border p-5 mb-6 ${cardBg}`}>
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles size={16} style={{ color: couleur }} />
          <span className="text-sm font-bold" style={{ color: couleur }}>{devisNumero}</span>
        </div>

        <div className="space-y-3">
          {clientName && (
            <div className="flex justify-between items-center">
              <span className={`text-sm ${textMuted}`}>Client</span>
              <span className={`text-sm font-medium ${textPrimary}`}>{clientName}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className={`text-sm ${textMuted}`}>Postes</span>
            <span className={`text-sm font-medium ${textPrimary}`}>{lineCount} ligne{lineCount > 1 ? 's' : ''}</span>
          </div>
          <div className={`flex justify-between items-center pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <span className={`text-sm font-semibold ${textPrimary}`}>Total TTC</span>
            <span className="text-xl font-bold" style={{ color: couleur }}>
              {fmtCurrency.format(totalTTC)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="w-full space-y-3">
        <button
          onClick={onViewDevis}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-semibold transition-all hover:shadow-lg min-h-[48px]"
          style={{ backgroundColor: couleur }}
        >
          <FileText size={18} />
          Voir le devis
          <ArrowRight size={16} />
        </button>
        <button
          onClick={onNewAnalysis}
          className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
            isDark ? 'text-slate-300 hover:bg-slate-800 border border-slate-700' : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sparkles size={16} />
          Nouvelle analyse
        </button>
      </div>
    </div>
  );
}
