/**
 * BillingDashboard — Full page for managing subscription & billing
 *
 * Sections:
 * 1. Current plan overview with usage bars
 * 2. Plan comparison / upgrade (2 plans: Gratuit / Pro)
 * 3. Billing history (from Stripe portal link)
 * 4. Cancel / reactivate
 */

import React, { useState, useCallback } from 'react';
import {
  CreditCard, ArrowUpRight, ExternalLink, AlertTriangle,
  Check, Zap, Crown, FileText, Users, HardHat, Camera, HardDrive,
  RefreshCw, Package
} from 'lucide-react';
import { useSubscriptionStore, PLANS, PLAN_ORDER, YEARLY_DISCOUNT } from '../../stores/subscriptionStore';
import {
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
  reactivateSubscription
} from '../../services/subscriptionsApi';
import { toast } from '../../stores/toastStore';
import { isDemo } from '../../supabaseClient';

const PLAN_ICONS = {
  gratuit: Zap,
  pro: Crown
};

const RESOURCE_ICONS = {
  devis: FileText,
  clients: Users,
  chantiers: HardHat,
  catalogue: Package,
  photos: Camera,
  storage_mb: HardDrive,
  equipe: HardHat
};

const RESOURCE_LABELS = {
  devis: 'Devis / mois',
  clients: 'Clients',
  chantiers: 'Chantiers',
  catalogue: 'Articles catalogue',
  photos: 'Photos',
  storage_mb: 'Stockage (Mo)',
  equipe: 'Membres équipe'
};

export default function BillingDashboard({ isDark, couleur }) {
  const planId = useSubscriptionStore((s) => s.planId);
  const usage = useSubscriptionStore((s) => s.usage);
  const sub = useSubscriptionStore((s) => s.subscription);
  const openUpgradeModal = useSubscriptionStore((s) => s.openUpgradeModal);
  const setSubscription = useSubscriptionStore((s) => s.setSubscription);

  const [billing, setBilling] = useState('monthly');
  const [loadingAction, setLoadingAction] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const plan = PLANS[planId] || PLANS.gratuit;
  const PlanIcon = PLAN_ICONS[planId] || Zap;
  const isFree = planId === 'gratuit';

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  // Stripe portal
  const handleOpenPortal = useCallback(async () => {
    setLoadingAction('portal');
    try {
      const { url, error } = await createPortalSession();
      if (error) {
        toast.error('Erreur', error.message);
        return;
      }
      if (url) window.open(url, '_blank');
      else toast.info('Non disponible', 'Portail Stripe non disponible en mode démo');
    } finally {
      setLoadingAction(null);
    }
  }, []);

  // Cancel
  const handleCancel = useCallback(async () => {
    setLoadingAction('cancel');
    try {
      const { error } = await cancelSubscription();
      if (error) {
        toast.error('Erreur', error.message);
        return;
      }
      setSubscription({ ...sub, cancel_at_period_end: true });
      toast.success('Abonnement annulé', 'Votre plan restera actif jusqu\'à la fin de la période');
      setShowCancelConfirm(false);
    } finally {
      setLoadingAction(null);
    }
  }, [sub, setSubscription]);

  // Reactivate
  const handleReactivate = useCallback(async () => {
    setLoadingAction('reactivate');
    try {
      const { error } = await reactivateSubscription();
      if (error) {
        toast.error('Erreur', error.message);
        return;
      }
      setSubscription({ ...sub, cancel_at_period_end: false });
      toast.success('Abonnement réactivé');
    } finally {
      setLoadingAction(null);
    }
  }, [sub, setSubscription]);

  // Select plan
  const handleSelectPlan = useCallback(async (targetPlanId) => {
    if (targetPlanId === planId) return;
    if (targetPlanId === 'gratuit') return;
    setLoadingAction(targetPlanId);
    try {
      const result = await createCheckoutSession(targetPlanId, billing);
      if (result.error) {
        toast.error('Erreur', result.error.message);
        return;
      }
      if (result.directUpgrade) {
        setSubscription({ plan: targetPlanId, status: 'active', billing_interval: billing });
        toast.success('Plan mis à jour', `Vous êtes maintenant sur le plan ${PLANS[targetPlanId].name}`);
        return;
      }
      if (result.url) window.location.href = result.url;
    } finally {
      setLoadingAction(null);
    }
  }, [planId, billing, setSubscription]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>Abonnement & Facturation</h1>
          <p className={`text-sm mt-1 ${textSecondary}`}>Gérez votre plan, vos limites et votre facturation</p>
        </div>
      </div>

      {/* Current Plan Card */}
      <div className={`rounded-2xl border ${cardBg} p-6`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: plan.color + '20', color: plan.color }}
            >
              <PlanIcon size={24} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${textPrimary}`}>Plan {plan.name}</h2>
              <p className={`text-sm ${textSecondary}`}>
                {isFree ? 'Gratuit' : `${plan.priceMonthly.toFixed(2).replace('.', ',')}€/mois`}
                {sub?.cancel_at_period_end && (
                  <span className="ml-2 text-red-500 font-medium">• Annulation prévue</span>
                )}
              </p>
              {sub?.current_period_end && (
                <p className="text-xs text-slate-400 mt-0.5">
                  Prochain renouvellement : {new Date(sub.current_period_end).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {!isFree && (
              <button
                onClick={handleOpenPortal}
                disabled={loadingAction === 'portal'}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'} transition-colors`}
              >
                <ExternalLink size={14} />
                Stripe
              </button>
            )}
            {isFree && (
              <button
                onClick={() => openUpgradeModal()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:shadow-md"
                style={{ backgroundColor: couleur || '#f97316' }}
              >
                <ArrowUpRight size={14} />
                Passer au Pro
              </button>
            )}
          </div>
        </div>

        {/* Usage summary */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(plan.limits)
            .filter(([key]) => ['devis', 'clients', 'chantiers', 'catalogue', 'equipe', 'storage_mb'].includes(key))
            .map(([key, limit]) => {
              const Icon = RESOURCE_ICONS[key] || FileText;
              const current = usage[key] ?? 0;
              const isUnlimited = limit === -1;
              const percent = isUnlimited ? 0 : (limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 100);
              const isDanger = !isUnlimited && percent >= 100;
              const isWarning = !isUnlimited && percent >= 80;

              return (
                <div
                  key={key}
                  className={`rounded-xl p-3 border ${isDanger ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10' : isWarning ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10' : isDark ? 'border-slate-700 bg-slate-700/50' : 'border-slate-100 bg-slate-50'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={12} className={textSecondary} />
                    <span className={`text-[10px] ${textSecondary}`}>{RESOURCE_LABELS[key]}</span>
                  </div>
                  <div className={`text-lg font-bold ${isDanger ? 'text-red-600' : textPrimary}`}>
                    {isUnlimited ? '∞' : `${current}/${limit}`}
                  </div>
                  {!isUnlimited && limit > 0 && (
                    <div className="mt-1.5 h-1 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
          })}
        </div>
      </div>

      {/* Plans Comparison */}
      <div className={`rounded-2xl border ${cardBg} p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-bold ${textPrimary}`}>Comparer les plans</h3>
          <div className="flex items-center gap-2 text-sm">
            <span className={billing === 'monthly' ? textPrimary : textSecondary}>Mensuel</span>
            <button
              onClick={() => setBilling(b => b === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative w-10 h-5 rounded-full transition-colors ${billing === 'yearly' ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${billing === 'yearly' ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            <span className={billing === 'yearly' ? textPrimary : textSecondary}>
              Annuel <span className="text-green-500 text-xs font-medium">-{YEARLY_DISCOUNT}%</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PLAN_ORDER.map((pid) => {
            const p = PLANS[pid];
            const Icon = PLAN_ICONS[pid];
            const isCurrent = pid === planId;
            const price = billing === 'yearly' && p.priceYearly
              ? (p.priceYearly / 12).toFixed(2).replace('.', ',')
              : p.priceMonthly === 0 ? null : p.priceMonthly.toFixed(2).replace('.', ',');

            return (
              <div
                key={pid}
                className={`rounded-xl border p-5 transition-all ${
                  isCurrent
                    ? 'border-2 border-orange-500 shadow-sm'
                    : isDark ? 'border-slate-700 hover:border-slate-500' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} style={{ color: p.color }} />
                  <span className={`font-semibold text-sm ${textPrimary}`}>{p.name}</span>
                  {isCurrent && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 font-medium">Actuel</span>}
                  {p.badge && !isCurrent && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500 text-white font-bold">{p.badge}</span>}
                </div>
                <div className={`text-2xl font-bold ${textPrimary}`}>
                  {price ? `${price}€/mois` : 'Gratuit'}
                </div>
                <p className={`text-xs mt-1 ${textSecondary}`}>{p.description}</p>
                <button
                  onClick={() => handleSelectPlan(pid)}
                  disabled={isCurrent || loadingAction === pid || pid === 'gratuit'}
                  className={`w-full mt-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isCurrent
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-default'
                      : pid === 'gratuit'
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-default'
                        : 'text-white hover:opacity-90'
                  }`}
                  style={(!isCurrent && pid !== 'gratuit') ? { backgroundColor: couleur || '#f97316' } : {}}
                >
                  {loadingAction === pid ? 'Chargement...' : isCurrent ? 'Plan actuel' : `Passer au ${p.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cancel / Reactivate */}
      {!isFree && (
        <div className={`rounded-2xl border ${cardBg} p-6`}>
          <h3 className={`text-lg font-bold ${textPrimary} mb-3`}>Gestion de l'abonnement</h3>

          {sub?.cancel_at_period_end ? (
            <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-amber-500" size={20} />
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Annulation programmée
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    Votre plan restera actif jusqu'à la fin de la période de facturation.
                  </p>
                </div>
              </div>
              <button
                onClick={handleReactivate}
                disabled={loadingAction === 'reactivate'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors"
              >
                <RefreshCw size={14} />
                Réactiver
              </button>
            </div>
          ) : showCancelConfirm ? (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-3">
                Êtes-vous sûr de vouloir annuler votre abonnement ?
              </p>
              <p className="text-xs text-red-600 dark:text-red-500 mb-4">
                Vous perdrez l'accès aux fonctionnalités Pro à la fin de la période.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={loadingAction === 'cancel'}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  {loadingAction === 'cancel' ? 'Annulation...' : 'Confirmer l\'annulation'}
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className={`px-4 py-2 rounded-xl text-sm ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'} transition-colors`}
                >
                  Garder mon plan
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className={`text-sm ${textSecondary}`}>
                Votre abonnement se renouvelle automatiquement.
              </p>
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
              >
                Annuler l'abonnement
              </button>
            </div>
          )}
        </div>
      )}

      {/* Demo notice */}
      {isDemo && (
        <p className="text-center text-xs text-slate-400">
          Mode démo — les changements de plan sont simulés localement
        </p>
      )}
    </div>
  );
}
