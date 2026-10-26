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

import { useSubscriptionStore, PLANS, getMinPlanForFeature, getMinPlanNameForFeature } from '../../stores/subscriptionStore';
import { Lock, ArrowRight } from 'lucide-react';
import { Bouton } from '../ui/Bouton';

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
  const planName = getMinPlanNameForFeature(feature);

  return (
    <div className="relative rounded-2xl border-2 border-dashed border-bord-fort bg-surface p-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-surface-2 flex items-center justify-center">
          <Lock className="w-6 h-6 text-encre-3" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-encre">
            Fonctionnalité réservée au plan {planName}
          </h3>
          <p className="text-sm text-encre-2 mt-1">
            Passez au plan {planName} pour débloquer cette fonctionnalité.
          </p>
        </div>
        <Bouton variante="principal" iconeFin={ArrowRight} onClick={onUpgrade}>
          Voir les offres
        </Bouton>
      </div>
    </div>
  );
}

/**
 * Limit reached overlay — shown when a resource count exceeds plan limit
 */
function LimitOverlay({ resource, max, onUpgrade }) {
  const RESOURCE_LABELS = {
    devis: 'devis',
    clients: 'clients',
    chantiers: 'chantiers',
    photos: 'photos',
    equipe: 'membres d\'équipe',
    storage_mb: 'Mo de stockage'
  };

  const label = RESOURCE_LABELS[resource] || resource;
  // Seuls les devis se comptent au mois (PLANS.gratuit : 5 devis par mois) ; les autres limites sont un total.
  const parMois = resource === 'devis' ? ' par mois' : '';

  return (
    <div className="rounded-2xl border border-bord bg-alerte-fond p-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center">
          <Lock className="w-5 h-5 text-alerte-texte" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-alerte-texte">
            Limite atteinte : {max} {label}{parMois}
          </h3>
          <p className="text-sm text-encre-2 mt-1">
            Votre plan actuel est limité à {max} {label}{parMois}.
          </p>
        </div>
        <Bouton variante="principal" iconeFin={ArrowRight} onClick={onUpgrade}>
          Voir les offres
        </Bouton>
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

  const minPlan = getMinPlanForFeature(feature);

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-info-fond text-info-texte ${className}`}>
      {PLANS[minPlan]?.name || 'Artisan'}
    </span>
  );
}
