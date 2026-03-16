/**
 * PlanLimitsWidget
 * Dashboard widget showing current usage vs free plan limits.
 *
 * Displays progress bars for clients, devis, and chantiers counts
 * against hardcoded free-tier limits. Progress bars turn red
 * when usage exceeds 80% of the limit.
 *
 * @module PlanLimitsWidget
 */

import React, { memo, useMemo } from 'react';
import { Gauge, Users, FileText, Hammer } from 'lucide-react';
import Widget, { WidgetHeader, WidgetContent } from './Widget';
import { useClients, useDevis, useChantiers } from '../../context/DataContext';

/** Free plan limits (hardcoded for now) */
const FREE_LIMITS = {
  clients: 5,
  devis: 10,
  chantiers: 3,
};

/** Threshold (0-1) above which the bar turns red */
const DANGER_THRESHOLD = 0.8;

/**
 * Single usage row with label, count, limit, and progress bar
 */
function UsageRow({ icon: Icon, label, count, limit, isDark, accentColor }) {
  const ratio = limit > 0 ? Math.min(count / limit, 1) : 0;
  const percentage = Math.round(ratio * 100);
  const isDanger = ratio >= DANGER_THRESHOLD;

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
        <span className={`text-sm font-semibold tabular-nums ${isDanger ? 'text-red-500' : mutedColor}`}>
          {count} / {limit}
        </span>
      </div>

      {/* Progress bar */}
      <div className={`w-full h-2 rounded-full overflow-hidden ${trackColor}`}>
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
            background: barColor,
          }}
        />
      </div>

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

  const accentColor = couleur || '#3b82f6';

  const counts = useMemo(
    () => ({
      clients: Array.isArray(clients) ? clients.length : 0,
      devis: Array.isArray(devis) ? devis.length : 0,
      chantiers: Array.isArray(chantiers) ? chantiers.length : 0,
    }),
    [clients, devis, chantiers]
  );

  const usageItems = [
    { key: 'clients', icon: Users, label: 'Clients', count: counts.clients, limit: FREE_LIMITS.clients },
    { key: 'devis', icon: FileText, label: 'Devis', count: counts.devis, limit: FREE_LIMITS.devis },
    { key: 'chantiers', icon: Hammer, label: 'Chantiers', count: counts.chantiers, limit: FREE_LIMITS.chantiers },
  ];

  // Overall usage ratio for the header badge
  const totalUsed = counts.clients + counts.devis + counts.chantiers;
  const totalLimit = FREE_LIMITS.clients + FREE_LIMITS.devis + FREE_LIMITS.chantiers;
  const overallPct = totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0;

  return (
    <Widget isDark={isDark}>
      <WidgetHeader
        title="Limites du plan"
        icon={<Gauge />}
        isDark={isDark}
        badge={`${overallPct}%`}
      />

      <WidgetContent>
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
          <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            Plan gratuit
          </p>
        </div>
      </WidgetContent>
    </Widget>
  );
});

export default PlanLimitsWidget;
