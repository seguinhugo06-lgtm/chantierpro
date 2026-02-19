/**
 * PlanLimitsWidget
 * Dashboard widget showing current usage vs plan limits.
 *
 * Reads limits from the subscription store (PLANS) instead of hardcoded values.
 * Displays progress bars for clients, devis, chantiers, photos counts.
 * Progress bars turn red when usage exceeds 80% of the limit.
 * Shows "Illimité" for Pro plan resources (-1 limit).
 * During trial, shows trial days remaining badge.
 *
 * @module PlanLimitsWidget
 */

import React, { memo, useMemo } from 'react';
import { Gauge, Users, FileText, Hammer, Camera, Crown, Sparkles } from 'lucide-react';
import Widget, { WidgetHeader, WidgetContent } from './Widget';
import { useClients, useDevis, useChantiers } from '../../context/DataContext';
import { useSubscriptionStore, PLANS } from '../../stores/subscriptionStore';

/** Threshold (0-1) above which the bar turns red */
const DANGER_THRESHOLD = 0.8;

/**
 * Single usage row with label, count, limit, and progress bar
 */
function UsageRow({ icon: Icon, label, count, limit, isDark, accentColor }) {
  const isUnlimited = limit === -1;
  const ratio = isUnlimited ? 0 : (limit > 0 ? Math.min(count / limit, 1) : 0);
  const percentage = Math.round(ratio * 100);
  const isDanger = !isUnlimited && ratio >= DANGER_THRESHOLD;

  const barColor = isDanger ? '#ef4444' : accentColor;
  const trackColor = isDark ? 'bg-slate-700' : 'bg-gray-100';
  const labelColor = isDark ? 'text-white' : 'text-gray-900';
  const mutedColor = isDark ? 'text-slate-400' : 'text-gray-500';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`
              flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
              ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}
            `}
          >
            <Icon size={15} style={{ color: isDanger ? '#ef4444' : accentColor }} />
          </div>
          <span className={`text-sm font-medium ${labelColor}`}>{label}</span>
        </div>
        {isUnlimited ? (
          <span className={`text-sm font-semibold ${mutedColor}`}>
            {count} · <span className="text-green-500">∞</span>
          </span>
        ) : (
          <span className={`text-sm font-semibold tabular-nums ${isDanger ? 'text-red-500' : mutedColor}`}>
            {count} / {limit}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {!isUnlimited && (
        <div className={`w-full h-2 rounded-full overflow-hidden ${trackColor}`}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${percentage}%`,
              background: barColor,
            }}
          />
        </div>
      )}

      {/* Warning text when near limit */}
      {isDanger && (
        <p className="text-xs text-red-500 font-medium">
          {count >= limit
            ? 'Limite atteinte'
            : `${limit - count} restant${limit - count > 1 ? 's' : ''}`}
        </p>
      )}
    </div>
  );
}

const PlanLimitsWidget = memo(function PlanLimitsWidget({ isDark, couleur }) {
  const { clients } = useClients();
  const { devis } = useDevis();
  const { chantiers } = useChantiers();

  const planId = useSubscriptionStore((s) => s.planId);
  const isTrial = useSubscriptionStore((s) => s.isTrial());
  const daysLeft = useSubscriptionStore((s) => s.trialDaysLeft());
  const openUpgradeModal = useSubscriptionStore((s) => s.openUpgradeModal);

  const plan = PLANS[planId] || PLANS.gratuit;
  const limits = plan.limits;
  const accentColor = couleur || '#3b82f6';
  const isPro = planId === 'pro';

  const counts = useMemo(
    () => ({
      clients: Array.isArray(clients) ? clients.length : 0,
      devis: Array.isArray(devis) ? devis.length : 0,
      chantiers: Array.isArray(chantiers) ? chantiers.length : 0,
    }),
    [clients, devis, chantiers]
  );

  const usageItems = [
    { key: 'clients', icon: Users, label: 'Clients', count: counts.clients, limit: limits.clients },
    { key: 'devis', icon: FileText, label: 'Devis', count: counts.devis, limit: limits.devis },
    { key: 'chantiers', icon: Hammer, label: 'Chantiers', count: counts.chantiers, limit: limits.chantiers },
  ];

  // Overall usage ratio for the header badge (only for limited plans)
  const limitedItems = usageItems.filter(i => i.limit > 0);
  const totalUsed = limitedItems.reduce((s, i) => s + i.count, 0);
  const totalLimit = limitedItems.reduce((s, i) => s + i.limit, 0);
  const overallPct = totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0;

  const headerBadge = isTrial
    ? `J-${daysLeft}`
    : isPro ? 'Pro' : `${overallPct}%`;

  return (
    <Widget isDark={isDark}>
      <WidgetHeader
        title={isTrial ? 'Essai Pro' : 'Limites du plan'}
        icon={isTrial || isPro ? <Crown /> : <Gauge />}
        isDark={isDark}
        badge={headerBadge}
      />

      <WidgetContent>
        {/* Trial banner inside widget */}
        {isTrial && (
          <div className={`mb-4 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
            daysLeft <= 3
              ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
              : 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300'
          }`}>
            <Sparkles size={14} />
            <span>
              {daysLeft <= 3
                ? `Plus que ${daysLeft} jour${daysLeft > 1 ? 's' : ''} d'essai Pro`
                : `Essai Pro · ${daysLeft} jours restants`}
            </span>
          </div>
        )}

        <div className="space-y-5">
          {usageItems.map((item) => (
            <UsageRow
              key={item.key}
              icon={item.icon}
              label={item.label}
              count={item.count}
              limit={item.limit}
              isDark={isDark}
              accentColor={accentColor}
            />
          ))}
        </div>

        {/* Plan info footer */}
        <div
          className={`
            mt-5 pt-4 border-t text-center
            ${isDark ? 'border-slate-700' : 'border-gray-100'}
          `}
        >
          {isPro && !isTrial ? (
            <div className="flex items-center justify-center gap-1.5">
              <Crown size={12} className="text-orange-500" />
              <p className={`text-xs font-medium ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                Plan Pro
              </p>
            </div>
          ) : (
            <button
              onClick={() => openUpgradeModal('generic')}
              className={`text-xs font-medium transition-colors ${isDark ? 'text-orange-400 hover:text-orange-300' : 'text-orange-600 hover:text-orange-700'}`}
            >
              {isTrial ? 'Garder le Pro →' : 'Passer au Pro →'}
            </button>
          )}
        </div>
      </WidgetContent>
    </Widget>
  );
});

export default PlanLimitsWidget;
