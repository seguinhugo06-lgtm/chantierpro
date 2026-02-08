/**
 * useFeatureGate — Hook for checking plan features & limits
 *
 * Usage:
 *   const { hasFeature, checkLimit, requireFeature, canCreate } = useFeatureGate();
 *
 *   // Check if a feature is available
 *   if (hasFeature('tresorerie')) { ... }
 *
 *   // Check a resource limit before creating
 *   const { allowed, current, limit } = checkLimit('devis');
 *
 *   // Guard an action — opens upgrade modal if blocked
 *   requireFeature('signatures', () => { doSomething(); });
 *
 *   // Shorthand: can user create another devis?
 *   canCreate('devis') // true/false
 */

import { useCallback } from 'react';
import { useSubscriptionStore, getMinPlanForFeature, PLANS } from '../stores/subscriptionStore';

export function useFeatureGate() {
  const planId = useSubscriptionStore((s) => s.planId);
  const usage = useSubscriptionStore((s) => s.usage);
  const openUpgradeModal = useSubscriptionStore((s) => s.openUpgradeModal);

  /**
   * Does the current plan include a feature?
   */
  const hasFeature = useCallback(
    (feature) => {
      const plan = PLANS[planId] || PLANS.gratuit;
      return plan.features.includes(feature);
    },
    [planId]
  );

  /**
   * Check a resource limit.
   * Returns { allowed, current, limit, percent }
   */
  const checkLimit = useCallback(
    (resource) => {
      const plan = PLANS[planId] || PLANS.gratuit;
      const limit = plan.limits[resource] ?? 0;
      const current = usage[resource] ?? 0;

      if (limit === -1) {
        return { allowed: true, current, limit: -1, percent: 0 };
      }
      return {
        allowed: current < limit,
        current,
        limit,
        percent: limit > 0 ? Math.round((current / limit) * 100) : 100
      };
    },
    [planId, usage]
  );

  /**
   * Guard: if feature available, run callback. Otherwise open upgrade modal.
   */
  const requireFeature = useCallback(
    (feature, callback) => {
      const plan = PLANS[planId] || PLANS.gratuit;
      if (plan.features.includes(feature)) {
        if (callback) callback();
        return true;
      }
      openUpgradeModal(feature);
      return false;
    },
    [planId, openUpgradeModal]
  );

  /**
   * Guard: if resource limit allows, run callback. Otherwise open upgrade modal.
   */
  const requireLimit = useCallback(
    (resource, callback) => {
      const plan = PLANS[planId] || PLANS.gratuit;
      const limit = plan.limits[resource] ?? 0;
      const current = usage[resource] ?? 0;

      if (limit === -1 || current < limit) {
        if (callback) callback();
        return true;
      }
      openUpgradeModal(resource);
      return false;
    },
    [planId, usage, openUpgradeModal]
  );

  /**
   * Shorthand: can user create another of this resource?
   */
  const canCreate = useCallback(
    (resource) => {
      const plan = PLANS[planId] || PLANS.gratuit;
      const limit = plan.limits[resource] ?? 0;
      if (limit === -1) return true;
      return (usage[resource] ?? 0) < limit;
    },
    [planId, usage]
  );

  /**
   * Get the minimum plan name needed for a feature
   */
  const getRequiredPlan = useCallback((feature) => {
    const minPlan = getMinPlanForFeature(feature);
    return minPlan ? PLANS[minPlan]?.name : null;
  }, []);

  /**
   * Is on free plan?
   */
  const isFree = planId === 'gratuit';

  return {
    planId,
    isFree,
    hasFeature,
    checkLimit,
    requireFeature,
    requireLimit,
    canCreate,
    getRequiredPlan,
    openUpgradeModal
  };
}

export default useFeatureGate;
