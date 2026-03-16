import { useState } from 'react';
import { Check, Sparkles, Loader2, ArrowRight, Crown, Zap } from 'lucide-react';
import { PLANS, PLAN_ORDER } from '../../stores/subscriptionStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';

const FEATURE_LABELS = {
  devis_basic: 'Devis & Factures',
  clients: 'Gestion clients',
  chantiers: 'Suivi chantiers',
  catalogue_basic: 'Catalogue (50 articles)',
  planning_basic: 'Planning basique',
  signatures: 'Signatures électroniques',
  relances: 'Relances automatiques',
  catalogue_complet: 'Catalogue illimité',
  export_pdf: 'Export PDF avancé',
  devis_ia: 'Devis IA',
  conformite_2026: 'Conformité Facture 2026',
  equipe: 'Gestion d\'équipe',
  tresorerie: 'Trésorerie & Projections',
  planning_avance: 'Planning avancé',
  pointage: 'Pointage & Heures',
  conges: 'Gestion des congés',
  sous_traitants: 'Sous-traitants',
  portail_client: 'Portail client',
  audit_trail: 'Journal d\'audit',
};

const PLAN_ICONS = {
  gratuit: null,
  artisan: Zap,
  equipe: Crown,
};

/**
 * UpgradeModal — Plan selection and checkout trigger.
 *
 * Props from modalStore:
 * - currentPlan: current plan ID
 * - highlightFeature: feature name to highlight
 * - onClose: close callback
 */
export default function UpgradeModal({ currentPlan, highlightFeature, onClose }) {
  const [interval, setInterval] = useState('monthly');
  const [loadingPlan, setLoadingPlan] = useState(null);
  const startCheckout = useSubscriptionStore((s) => s.startCheckout);

  const handleUpgrade = async (planId) => {
    setLoadingPlan(planId);
    try {
      const result = await startCheckout(planId, interval);
      if (result?.demo) {
        // Demo mode — plan changed locally, reload UI
        onClose?.();
        window.location.reload();
      }
      // If not demo, user is redirected to Stripe
    } catch (err) {
      console.error('[UpgradeModal] Checkout error:', err);
      setLoadingPlan(null);
    }
  };

  const upgradePlans = PLAN_ORDER.filter((id) => id !== 'gratuit');

  return (
    <div className="p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center">
          <Sparkles size={28} className="text-white" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
          Passez à la vitesse supérieure
        </h2>
        <p className="text-slate-500 mt-1 text-sm">
          Choisissez le plan adapté à votre activité
        </p>
      </div>

      {/* Interval toggle */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <button
          onClick={() => setInterval('monthly')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            interval === 'monthly'
              ? 'bg-orange-500 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Mensuel
        </button>
        <button
          onClick={() => setInterval('yearly')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            interval === 'yearly'
              ? 'bg-orange-500 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Annuel
          <span className="ml-1 text-xs opacity-80">-17%</span>
        </button>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {upgradePlans.map((planId) => {
          const plan = PLANS[planId];
          const isCurrent = planId === currentPlan;
          const price = interval === 'monthly' ? plan.price.monthly : plan.price.yearly;
          const PlanIcon = PLAN_ICONS[planId];
          const isPopular = planId === 'artisan';

          return (
            <div
              key={planId}
              className={`relative rounded-2xl border-2 p-5 transition-all ${
                isPopular
                  ? 'border-orange-500 shadow-lg shadow-orange-500/10'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Popular badge */}
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-orange-500 text-white text-xs font-semibold rounded-full">
                  Populaire
                </div>
              )}

              {/* Plan header */}
              <div className="flex items-center gap-2 mb-3">
                {PlanIcon && <PlanIcon size={20} className="text-orange-500" />}
                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
              </div>

              {/* Price */}
              <div className="mb-4">
                <span className="text-3xl font-bold text-slate-900">{price} €</span>
                <span className="text-slate-500 text-sm">
                  /{interval === 'monthly' ? 'mois' : 'an'} HT
                </span>
              </div>

              {/* Limits */}
              <div className="text-xs text-slate-500 mb-3">
                {plan.limits.devis === -1 ? 'Devis illimités' : `${plan.limits.devis} devis`}
                {' • '}
                {plan.limits.clients === -1 ? 'Clients illimités' : `${plan.limits.clients} clients`}
                {plan.limits.equipe > 0 && ` • ${plan.limits.equipe} membres`}
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check
                      size={16}
                      className={`mt-0.5 flex-shrink-0 ${
                        highlightFeature === f ? 'text-orange-500' : 'text-green-500'
                      }`}
                    />
                    <span className={`${highlightFeature === f ? 'font-semibold text-orange-600' : 'text-slate-700'}`}>
                      {FEATURE_LABELS[f] || f.replace(/_/g, ' ')}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                <div className="w-full py-2.5 rounded-xl text-center text-sm font-medium bg-slate-100 text-slate-500">
                  Plan actuel
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(planId)}
                  disabled={loadingPlan !== null}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60 ${
                    isPopular
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-lg hover:shadow-orange-500/25'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {loadingPlan === planId ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Redirection...
                    </>
                  ) : (
                    <>
                      Choisir {plan.name}
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-slate-400 mt-4">
        Paiement sécurisé par Stripe. Annulable à tout moment.
      </p>
    </div>
  );
}
