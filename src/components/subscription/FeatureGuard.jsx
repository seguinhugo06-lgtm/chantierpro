/**
 * FeatureGuard — Conditional renderer based on plan features / limits
 *
 * Usage:
 *   <FeatureGuard feature="tresorerie">
 *     <TresorerieModule ... />
 *   </FeatureGuard>
 *
 *   <FeatureGuard limit="devis" fallback={<UpgradeBanner />}>
 *     <CreateDevisForm />
 *   </FeatureGuard>
 */

import React from 'react';
import { useSubscriptionStore, PLANS } from '../../stores/subscriptionStore';
import { Lock, ArrowUpRight } from 'lucide-react';

/**
 * FeatureGuard wrapper — renders children only if plan allows.
 *
 * Props:
 *   feature  — feature key to check (e.g. "tresorerie")
 *   limit    — resource key to check against limits (e.g. "devis")
 *   fallback — custom fallback JSX (default: locked overlay)
 *   silent   — if true, renders nothing when blocked (no fallback)
 *   children — content to show when allowed
 */
export default function FeatureGuard({ feature, limit, fallback, silent = false, children }) {
  const planId = useSubscriptionStore((s) => s.planId);
  const usage = useSubscriptionStore((s) => s.usage);
  const openUpgradeModal = useSubscriptionStore((s) => s.openUpgradeModal);

  const plan = PLANS[planId] || PLANS.gratuit;

  // Check feature gate
  if (feature && !plan.features.includes(feature)) {
    if (silent) return null;
    if (fallback) return fallback;
    return (
      <LockedOverlay
        feature={feature}
        onUpgrade={() => openUpgradeModal(feature)}
      />
    );
  }

  // Check limit gate
  if (limit) {
    const lim = plan.limits[limit] ?? 0;
    const current = usage[limit] ?? 0;
    if (lim !== -1 && current >= lim) {
      if (silent) return null;
      if (fallback) return fallback;
      return (
        <LimitOverlay
          resource={limit}
          current={current}
          max={lim}
          onUpgrade={() => openUpgradeModal(limit)}
        />
      );
    }
  }

  return children;
}

/**
 * Locked feature overlay — shown when a feature requires a higher plan
 */
function LockedOverlay({ feature, onUpgrade }) {
  const planName = 'Pro';

  return (
    <div className="relative rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50 p-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
          <Lock className="w-6 h-6 text-slate-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
            Fonctionnalité réservée au plan {planName}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Passez au plan {planName} pour débloquer cette fonctionnalité.
          </p>
        </div>
        <button
          onClick={onUpgrade}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium text-sm hover:shadow-lg hover:shadow-orange-500/25 transition-all"
        >
          <ArrowUpRight size={16} />
          Voir les plans
        </button>
      </div>
    </div>
  );
}

/**
 * Limit reached overlay — shown when a resource count exceeds plan limit
 */
function LimitOverlay({ resource, current, max, onUpgrade }) {
  const RESOURCE_LABELS = {
    devis: 'devis',
    clients: 'clients',
    chantiers: 'chantiers',
    photos: 'photos',
    equipe: 'membres d\'équipe',
    storage_mb: 'Mo de stockage'
  };

  const label = RESOURCE_LABELS[resource] || resource;

  return (
    <div className="rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-900/20 p-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
          <Lock className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            Limite atteinte : {current}/{max} {label}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Votre plan actuel est limité à {max} {label} par mois.
          </p>
        </div>
        <button
          onClick={onUpgrade}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium text-sm hover:shadow-lg transition-all"
        >
          <ArrowUpRight size={16} />
          Augmenter ma limite
        </button>
      </div>
    </div>
  );
}

/**
 * Inline badge showing that a feature requires upgrade
 * Use this next to sidebar items or buttons
 */
export function UpgradeBadge({ feature, className = '' }) {
  const planId = useSubscriptionStore((s) => s.planId);
  const plan = PLANS[planId] || PLANS.gratuit;

  if (plan.features.includes(feature)) return null;

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 ${className}`}>
      PRO
    </span>
  );
}
