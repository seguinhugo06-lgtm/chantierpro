/**
 * FeatureGuard — Conditionally renders children based on plan feature access.
 *
 * Usage:
 *   <FeatureGuard feature="tresorerie">
 *     <TresoreriePage />
 *   </FeatureGuard>
 *
 *   <FeatureGuard feature="devis_ia" fallback={<CustomUpgrade />}>
 *     <DevisIA />
 *   </FeatureGuard>
 */

import React from 'react';
import { useSubscriptionStore, PLANS, PLAN_ORDER } from '../../stores/subscriptionStore';
import UpgradePrompt from './UpgradePrompt';

export default function FeatureGuard({ feature, children, fallback, isDark, couleur }) {
  const canUse = useSubscriptionStore((s) => s.canUse);
  const planId = useSubscriptionStore((s) => s.planId);

  if (canUse(feature)) {
    return children;
  }

  // Find the minimum plan required for this feature
  const minPlan = PLAN_ORDER.find((id) => PLANS[id].features.includes(feature)) || 'equipe';

  return fallback || (
    <UpgradePrompt
      feature={feature}
      requiredPlan={minPlan}
      currentPlan={planId}
      isDark={isDark}
      couleur={couleur}
    />
  );
}
