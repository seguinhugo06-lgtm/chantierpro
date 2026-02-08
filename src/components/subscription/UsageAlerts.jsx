/**
 * UsageAlerts — Dashboard widget showing plan usage and limits
 *
 * Displays progress bars for each resource (devis, clients, chantiers, etc.)
 * with color-coded warnings when approaching or exceeding limits.
 */

import React from 'react';
import { useSubscriptionStore, PLANS } from '../../stores/subscriptionStore';
import { ArrowUpRight, FileText, Users, Building2, Camera, HardDrive, HardHat } from 'lucide-react';

const RESOURCE_CONFIG = {
  devis: { label: 'Devis ce mois', icon: FileText, unit: '' },
  clients: { label: 'Clients', icon: Users, unit: '' },
  chantiers: { label: 'Chantiers', icon: Building2, unit: '' },
  photos: { label: 'Photos', icon: Camera, unit: '' },
  storage_mb: { label: 'Stockage', icon: HardDrive, unit: 'Mo' },
  equipe: { label: 'Équipe', icon: HardHat, unit: '' }
};

/**
 * UsageBar — Single resource progress bar
 */
function UsageBar({ resource, current, limit, icon: Icon, label, unit }) {
  if (limit === -1) return null; // Unlimited → don't show bar
  if (limit === 0 && current === 0) return null; // Unused resource

  const percent = limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 100;
  const isWarning = percent >= 80;
  const isDanger = percent >= 100;

  const barColor = isDanger
    ? 'bg-red-500'
    : isWarning
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  const textColor = isDanger
    ? 'text-red-600 dark:text-red-400'
    : isWarning
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-slate-600 dark:text-slate-400';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
          <Icon size={12} />
          <span>{label}</span>
        </div>
        <span className={`font-medium ${textColor}`}>
          {current}{unit ? ` ${unit}` : ''} / {limit}{unit ? ` ${unit}` : ''}
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * UsageAlerts widget — renders inside Dashboard
 */
export default function UsageAlerts({ isDark, couleur }) {
  const planId = useSubscriptionStore((s) => s.planId);
  const usage = useSubscriptionStore((s) => s.usage);
  const openUpgradeModal = useSubscriptionStore((s) => s.openUpgradeModal);
  const subscription = useSubscriptionStore((s) => s.subscription);

  const plan = PLANS[planId] || PLANS.gratuit;
  const isFree = planId === 'gratuit';

  // Calculate how many resources are near or at limit
  const warnings = Object.entries(plan.limits).filter(([key, limit]) => {
    if (limit === -1 || limit === 0) return false;
    const current = usage[key] ?? 0;
    return current >= limit * 0.8;
  });

  // Trial banner
  const isTrial = subscription?.status === 'trialing';
  const trialEnd = subscription?.trial_end;
  const trialDays = trialEnd
    ? Math.max(0, Math.ceil((new Date(trialEnd) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className={`rounded-2xl border p-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: plan.color + '20', color: plan.color }}
          >
            <FileText size={16} />
          </div>
          <div>
            <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Plan {plan.name}
            </h3>
            <p className="text-[10px] text-slate-500">
              {isTrial ? `Essai — ${trialDays}j restants` : plan.description}
            </p>
          </div>
        </div>
        {isFree && (
          <button
            onClick={() => openUpgradeModal()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-white transition-all hover:shadow-md"
            style={{ backgroundColor: couleur || '#f97316' }}
          >
            <ArrowUpRight size={12} />
            Upgrade
          </button>
        )}
      </div>

      {/* Trial warning */}
      {isTrial && trialDays <= 3 && (
        <div className="mb-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
          ⏰ Votre essai se termine dans {trialDays} jour{trialDays > 1 ? 's' : ''}. Choisissez un plan pour continuer.
        </div>
      )}

      {/* Usage bars */}
      <div className="space-y-2.5">
        {Object.entries(RESOURCE_CONFIG).map(([key, config]) => {
          const limit = plan.limits[key] ?? 0;
          const current = usage[key] ?? 0;

          return (
            <UsageBar
              key={key}
              resource={key}
              current={current}
              limit={limit}
              icon={config.icon}
              label={config.label}
              unit={config.unit}
            />
          );
        })}
      </div>

      {/* Upgrade nudge when close to limits */}
      {warnings.length > 0 && !isTrial && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={() => openUpgradeModal()}
            className="w-full text-center text-xs text-orange-500 hover:text-orange-600 font-medium transition-colors"
          >
            Vous approchez de vos limites — Voir les plans →
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Compact usage indicator for the sidebar or header
 */
export function UsageBadge() {
  const planId = useSubscriptionStore((s) => s.planId);
  const usage = useSubscriptionStore((s) => s.usage);
  const plan = PLANS[planId] || PLANS.gratuit;

  // Count resources at or near limit
  const atLimit = Object.entries(plan.limits).filter(([key, limit]) => {
    if (limit === -1 || limit === 0) return false;
    return (usage[key] ?? 0) >= limit;
  }).length;

  if (atLimit === 0) return null;

  return (
    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
      {atLimit} limite{atLimit > 1 ? 's' : ''} atteinte{atLimit > 1 ? 's' : ''}
    </span>
  );
}
