/**
 * UpgradePrompt — Shown when a user tries to access a gated feature.
 *
 * Displays a friendly upgrade card with the required plan info.
 */

import React from 'react';
import { Lock, ArrowRight, Sparkles } from 'lucide-react';
import { PLANS } from '../../stores/subscriptionStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';

const FEATURE_LABELS = {
  tresorerie: 'Trésorerie & Projections',
  equipe: 'Gestion d\'équipe',
  planning_avance: 'Planning avancé',
  pointage: 'Pointage & Heures',
  conges: 'Gestion des congés',
  sous_traitants: 'Sous-traitants',
  portail_client: 'Portail client',
  devis_ia: 'Devis IA',
  signatures: 'Signatures électroniques',
  relances: 'Relances automatiques',
  conformite_2026: 'Conformité Facture 2026',
  export_pdf: 'Export PDF avancé',
  catalogue_complet: 'Catalogue complet',
  audit_trail: 'Journal d\'audit',
};

export default function UpgradePrompt({
  feature,
  requiredPlan,
  currentPlan,
  isDark,
  couleur = '#f97316',
}) {
  const openUpgradeModal = useSubscriptionStore((s) => s.openUpgradeModal);

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  const featureLabel = FEATURE_LABELS[feature] || feature;
  const planLabel = PLANS[requiredPlan]?.name || requiredPlan;
  const planPrice = PLANS[requiredPlan]?.price?.monthly;

  return (
    <div className="flex items-center justify-center py-12 px-4">
      <div className={`max-w-md w-full rounded-2xl border p-6 sm:p-8 text-center space-y-4 ${cardBg}`}>
        {/* Lock icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: `${couleur}15` }}
        >
          <Lock size={28} style={{ color: couleur }} />
        </div>

        {/* Title */}
        <div>
          <h2 className="text-lg font-bold mb-1">{featureLabel}</h2>
          <p className={`text-sm ${textMuted}`}>
            Cette fonctionnalité est disponible à partir du plan <strong style={{ color: couleur }}>{planLabel}</strong>
          </p>
        </div>

        {/* Price */}
        {planPrice > 0 && (
          <div className={`text-sm ${textMuted}`}>
            À partir de <span className="font-bold text-lg" style={{ color: couleur }}>{planPrice} €</span>/mois HT
          </div>
        )}

        {/* Features preview */}
        <div className={`text-left p-4 rounded-xl space-y-2 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
          <p className={`text-xs font-medium ${textMuted}`}>Le plan {planLabel} inclut :</p>
          {PLANS[requiredPlan]?.features.slice(0, 5).map((f) => (
            <div key={f} className="flex items-center gap-2 text-xs">
              <Sparkles size={12} style={{ color: couleur }} />
              <span>{FEATURE_LABELS[f] || f.replace(/_/g, ' ')}</span>
            </div>
          ))}
          {(PLANS[requiredPlan]?.features.length || 0) > 5 && (
            <p className={`text-xs ${textMuted}`}>
              Et {PLANS[requiredPlan].features.length - 5} autres fonctionnalités…
            </p>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={() => openUpgradeModal({ highlightFeature: feature })}
          className="w-full py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          style={{ background: couleur }}
        >
          Passer au plan {planLabel}
          <ArrowRight size={16} />
        </button>

        {/* Current plan info */}
        <p className={`text-xs ${textMuted}`}>
          Plan actuel : {PLANS[currentPlan]?.name || 'Gratuit'}
        </p>
      </div>
    </div>
  );
}
