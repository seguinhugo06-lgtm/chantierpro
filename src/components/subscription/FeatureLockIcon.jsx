/**
 * FeatureLockIcon — Small clickable padlock for sidebar/button items
 *
 * Shows a lock icon next to features that require a higher plan.
 * Clicking opens the upgrade modal with the relevant context.
 */

import React from 'react';
import { Lock } from 'lucide-react';
import { useSubscriptionStore, PLANS } from '../../stores/subscriptionStore';

/**
 * FeatureLockIcon — padlock that opens upgrade modal
 *
 * @param {string} feature - Feature key to check (e.g. "signatures")
 * @param {string} [size="sm"] - "sm" (sidebar) or "md" (buttons)
 */
export default function FeatureLockIcon({ feature, size = 'sm' }) {
  const planId = useSubscriptionStore((s) => s.planId);
  const openUpgradeModal = useSubscriptionStore((s) => s.openUpgradeModal);
  const plan = PLANS[planId] || PLANS.gratuit;

  // Don't show if feature is available
  if (plan.features.includes(feature)) return null;

  const minPlanName = 'Pro';

  // Color: red for free plan, orange for partial plans
  const colorClass = planId === 'gratuit'
    ? 'text-red-500 hover:text-red-600'
    : 'text-orange-400 hover:text-orange-500';

  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        openUpgradeModal(feature);
      }}
      className={`inline-flex items-center ml-1.5 ${colorClass} cursor-pointer transition-all hover:scale-110`}
      title={`Débloquer en plan ${minPlanName}`}
    >
      <Lock className={sizeClass} />
    </button>
  );
}

/**
 * FeatureUsageBadge — Shows quota usage counter (e.g. "2/3")
 *
 * @param {string} resource - Resource key (devis, clients, signatures, etc.)
 * @param {boolean} [showIfUnlimited=false] - Show for unlimited plans too
 */
export function FeatureUsageBadge({ resource, showIfUnlimited = false }) {
  const planId = useSubscriptionStore((s) => s.planId);
  const usage = useSubscriptionStore((s) => s.usage);
  const openUpgradeModal = useSubscriptionStore((s) => s.openUpgradeModal);
  const plan = PLANS[planId] || PLANS.gratuit;

  const limit = plan.limits[resource] ?? 0;
  const current = usage[resource] ?? 0;

  // Don't show for unlimited unless requested
  if (limit === -1 && !showIfUnlimited) return null;
  if (limit === 0 && current === 0) return null;

  const isUnlimited = limit === -1;
  const percent = isUnlimited ? 0 : (limit > 0 ? Math.round((current / limit) * 100) : 100);

  // Color coding
  let colorClass;
  if (isUnlimited) {
    colorClass = 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
  } else if (percent >= 100) {
    colorClass = 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 font-bold';
  } else if (percent >= 70) {
    colorClass = 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400';
  } else {
    colorClass = 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400';
  }

  const handleClick = (e) => {
    e.stopPropagation();
    if (percent >= 100) {
      openUpgradeModal(resource + '_limit');
    }
  };

  return (
    <span
      onClick={handleClick}
      className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${colorClass} ${percent >= 100 ? 'cursor-pointer' : ''}`}
      title={isUnlimited ? 'Illimité' : `${limit - current} utilisation${limit - current !== 1 ? 's' : ''} restante${limit - current !== 1 ? 's' : ''} ce mois`}
    >
      {isUnlimited ? '∞' : `${current}/${limit}`}
    </span>
  );
}
