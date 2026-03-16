import React from 'react';
import { X, CheckCircle, XCircle, Mic, Lightbulb } from 'lucide-react';

/**
 * Modal guide dictée vocale — affiché au 1er usage.
 */
export default function VoiceGuide({ isOpen, onClose, isDark, couleur }) {
  if (!isOpen) return null;

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  const goodExamples = [
    'Pose 2 prises Legrand Mosaic, disjoncteur C10, 2h de main d\'œuvre à 45€',
    '10 mètres linéaires de plinthes en chêne, prix unitaire 12 euros',
    'Fourniture et pose BA13 sur 15 mètres carrés, tarifs Bordeaux',
  ];

  const badExamples = [
    'Euh… voilà, faudrait que tu mettes quelques trucs',
    'Des prises et des fils, le client veut ça rapide',
    'Le même devis que la dernière fois',
  ];

  const tips = [
    { icon: '📦', text: 'Nommez les matériaux avec marques et références si possible' },
    { icon: '🔢', text: 'Précisez quantités et unités (mètres, heures, unités…)' },
    { icon: '💰', text: 'Indiquez les prix unitaires quand vous les connaissez' },
    { icon: '📍', text: 'Mentionnez la ville pour adapter les tarifs régionaux' },
    { icon: '🏷️', text: 'Séparez clairement fournitures et main d\'œuvre' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className={`w-full max-w-lg rounded-2xl border shadow-xl overflow-hidden ${cardBg}`}>
        {/* Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: couleur }}>
              <Mic size={20} />
            </div>
            <div>
              <h2 className="font-bold text-base">Guide de dictée vocale</h2>
              <p className={`text-xs ${textMuted}`}>Optimisez vos devis dictés</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-lg ${textMuted} hover:opacity-70`}>
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Good examples */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2 text-green-500">
              <CheckCircle size={16} />
              À dire
            </h3>
            <div className="space-y-1.5">
              {goodExamples.map((ex, i) => (
                <div key={i} className={`text-xs p-2.5 rounded-xl ${isDark ? 'bg-green-900/20 border-green-800/30' : 'bg-green-50 border-green-100'} border`}>
                  « {ex} »
                </div>
              ))}
            </div>
          </div>

          {/* Bad examples */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2 text-red-500">
              <XCircle size={16} />
              À éviter
            </h3>
            <div className="space-y-1.5">
              {badExamples.map((ex, i) => (
                <div key={i} className={`text-xs p-2.5 rounded-xl ${isDark ? 'bg-red-900/20 border-red-800/30' : 'bg-red-50 border-red-100'} border`}>
                  « {ex} »
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2" style={{ color: couleur }}>
              <Lightbulb size={16} />
              Conseils
            </h3>
            <div className="space-y-1.5">
              {tips.map((tip, i) => (
                <div key={i} className={`text-xs p-2.5 rounded-xl flex items-center gap-2 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <span>{tip.icon}</span>
                  <span>{tip.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-white font-medium hover:opacity-90 transition-opacity"
            style={{ background: couleur }}
          >
            Compris, je dicte !
          </button>
        </div>
      </div>
    </div>
  );
}
