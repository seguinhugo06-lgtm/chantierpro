/**
 * UpgradeModal — Contextual upgrade modal (Gratuit → Pro)
 *
 * Shows a bottom-sheet style modal with:
 * - Contextual title/subtitle based on the blocked feature
 * - Side-by-side comparison: Gratuit vs Pro
 * - Monthly/yearly toggle
 * - Stripe checkout integration
 */

import React, { useState, useCallback } from 'react';
import {
  X, Check, Lock, ArrowRight, Zap, Crown
} from 'lucide-react';
import {
  useSubscriptionStore, PLANS, YEARLY_DISCOUNT,
  UPGRADE_CONTEXTS
} from '../../stores/subscriptionStore';
import { createCheckoutSession } from '../../services/subscriptionsApi';
import { toast } from '../../stores/toastStore';
import { isDemo } from '../../supabaseClient';

const PLAN_ICONS = { gratuit: Zap, pro: Crown };

export default function UpgradeModal() {
  const isOpen = useSubscriptionStore((s) => s.upgradeModalOpen);
  const blockedFeature = useSubscriptionStore((s) => s.upgradeModalFeature);
  const currentPlanId = useSubscriptionStore((s) => s.planId);
  const closeUpgradeModal = useSubscriptionStore((s) => s.closeUpgradeModal);
  const setSubscription = useSubscriptionStore((s) => s.setSubscription);

  const [billing, setBilling] = useState('monthly');
  const [loadingPlan, setLoadingPlan] = useState(null);

  // Determine context
  const context = UPGRADE_CONTEXTS[blockedFeature] || UPGRADE_CONTEXTS.generic;
  const currentPlan = PLANS[currentPlanId] || PLANS.gratuit;
  const proPlan = PLANS.pro;
  const CurIcon = PLAN_ICONS[currentPlanId] || Zap;

  const handleSelectPlan = useCallback(async (planId) => {
    if (planId === currentPlanId) return;
    if (planId === 'gratuit') return;

    setLoadingPlan(planId);
    try {
      const result = await createCheckoutSession(planId, billing);
      if (result.error) {
        toast.error('Erreur', result.error.message);
        return;
      }
      if (result.directUpgrade) {
        setSubscription({ plan: planId, status: 'active', billing_interval: billing });
        toast.success('Plan activé !', `Bienvenue dans le plan ${PLANS[planId].name}`);
        closeUpgradeModal();
        return;
      }
      if (result.url) window.location.href = result.url;
    } catch {
      toast.error('Erreur', 'Une erreur est survenue');
    } finally {
      setLoadingPlan(null);
    }
  }, [billing, currentPlanId, closeUpgradeModal, setSubscription]);

  if (!isOpen) return null;

  const proPrice = billing === 'yearly' && proPlan.priceYearly
    ? (proPlan.priceYearly / 12).toFixed(2).replace('.', ',')
    : proPlan.priceMonthly.toFixed(2).replace('.', ',');

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={closeUpgradeModal}
      />

      {/* Modal — slides up on mobile */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-[slideUp_300ms_ease-out]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                <Lock size={20} className="text-orange-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {context.title}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {context.subtitle}
                </p>
              </div>
            </div>
            <button
              onClick={closeUpgradeModal}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Comparison grid */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Current plan column */}
          <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
              Votre plan actuel
            </p>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border"
                style={{
                  backgroundColor: currentPlan.bgColor,
                  color: currentPlan.color,
                  borderColor: currentPlan.borderColor
                }}
              >
                <CurIcon size={12} className="mr-1" />
                {currentPlan.name}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              {currentPlan.priceMonthly === 0 ? 'Gratuit' : `${currentPlan.priceMonthly}€/mois`}
            </p>
            <ul className="space-y-2">
              {(currentPlan.featureLabels || []).slice(0, 6).map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  {f.included ? (
                    <Check size={14} className="text-green-500 flex-shrink-0" />
                  ) : (
                    <X size={14} className="text-red-400 flex-shrink-0" />
                  )}
                  <span className={f.included ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400'}>
                    {f.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pro plan column */}
          <div
            className="rounded-xl border-2 p-5 relative"
            style={{ borderColor: proPlan.color + '80' }}
          >
            <span className="absolute -top-3 right-4 px-3 py-0.5 text-[10px] font-bold rounded-full bg-orange-500 text-white">
              RECOMMANDÉ
            </span>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
              Plan recommandé
            </p>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border"
                style={{
                  backgroundColor: proPlan.bgColor,
                  color: proPlan.color,
                  borderColor: proPlan.borderColor
                }}
              >
                <Crown size={12} className="mr-1" />
                Pro
              </span>
            </div>
            <div className="mb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold" style={{ color: proPlan.color }}>
                  {proPrice}€
                </span>
                <span className="text-sm text-slate-500">HT/mois</span>
              </div>
              {billing === 'yearly' && (
                <p className="text-xs text-slate-400 mt-0.5">
                  Facturé {proPlan.priceYearly}€/an
                </p>
              )}
              {billing === 'yearly' && (
                <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Economisez {YEARLY_DISCOUNT}%
                </span>
              )}
            </div>
            <ul className="space-y-2">
              {(proPlan.featureLabels || []).filter(f => f.included).slice(0, 8).map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  <Check size={14} className="text-green-500 flex-shrink-0" />
                  <span
                    className={`text-slate-600 dark:text-slate-300 ${
                      context.highlight && f.name.toLowerCase().includes(context.highlight.replace('_', ' '))
                        ? 'font-semibold text-orange-600 dark:text-orange-400'
                        : ''
                    }`}
                  >
                    {f.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 px-6 py-2">
          <span className={`text-xs font-medium ${billing === 'monthly' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
            Mensuel
          </span>
          <button
            onClick={() => setBilling(b => b === 'monthly' ? 'yearly' : 'monthly')}
            className={`relative w-10 h-5 rounded-full transition-colors ${billing === 'yearly' ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${billing === 'yearly' ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
          <span className={`text-xs font-medium ${billing === 'yearly' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
            Annuel
          </span>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-2 mt-2">
          <button
            onClick={() => handleSelectPlan('pro')}
            disabled={loadingPlan === 'pro'}
            className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/25 transition-all flex items-center justify-center gap-2"
          >
            {loadingPlan === 'pro' ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <>
                Passer au plan Pro
                <ArrowRight size={16} />
              </>
            )}
          </button>
          <button
            onClick={closeUpgradeModal}
            className="w-full py-2 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline transition-colors"
          >
            Plus tard
          </button>
        </div>

        {isDemo && (
          <p className="text-center text-[10px] text-slate-400 pb-4">Mode démo — simulation</p>
        )}
      </div>

      {/* Slide-up animation */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
