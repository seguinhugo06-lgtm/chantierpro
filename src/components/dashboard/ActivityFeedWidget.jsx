import React, { useState, useEffect, useCallback, memo } from 'react';
import { Activity, FileText, Users, HardHat, Receipt, Clock, ChevronRight, RefreshCw } from 'lucide-react';
import { getRecentActivity, ACTION_LABELS, ACTION_ICONS, ENTITY_LABELS } from '../../lib/auditService';
import supabase, { isDemo } from '../../supabaseClient';
import { formatMoney } from '../../lib/formatters';

const sb = isDemo ? null : supabase;

// Entity icon mapping
const ENTITY_ICONS = {
  devis: FileText,
  chantier: HardHat,
  client: Users,
  facture: Receipt,
  acompte: Receipt,
};

// Entity color mapping
const ENTITY_COLORS = {
  devis: 'blue',
  chantier: 'purple',
  client: 'emerald',
  facture: 'orange',
  acompte: 'orange',
};

/**
 * Format a relative timestamp in French
 */
function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  const hhmm = `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`;

  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin}min`;
  if (diffD === 0) return `Auj. ${hhmm}`;
  if (diffD === 1) return `Hier ${hhmm}`;
  if (diffD < 7) return `Il y a ${diffD}j`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/**
 * Build a user-friendly description for an audit entry
 */
function buildDescription(entry) {
  const entityLabel = ENTITY_LABELS[entry.entity_type] || entry.entity_type;
  const actionLabel = ACTION_LABELS[entry.action] || entry.action;
  const userName = entry.user_name || 'Utilisateur';

  // Status change
  if (entry.action === 'status_changed' && entry.changes?.statut) {
    return `${userName} — ${entityLabel} → ${entry.changes.statut.new || ''}`;
  }

  // Updated with changes count
  if (entry.action === 'updated' && entry.changes) {
    const count = Object.keys(entry.changes).length;
    return `${userName} — ${actionLabel} (${count} champ${count > 1 ? 's' : ''})`;
  }

  return `${userName} — ${actionLabel}`;
}

/**
 * ActivityFeedWidget — Dashboard widget showing recent activity from audit_logs.
 * Replaces the old RecentActivityWidget which computed activities from local data.
 */
const ActivityFeedWidget = memo(function ActivityFeedWidget({
  isDark,
  modeDiscret,
  onActivityClick,
  orgId,
  userId,
}) {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadActivity = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getRecentActivity(sb, {
        limit: 10,
        userId,
        orgId,
      });
      setEntries(data || []);
    } catch (err) {
      console.error('ActivityFeedWidget: failed to load', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, orgId]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const colorMap = {
    emerald: {
      bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
      icon: isDark ? 'text-emerald-400' : 'text-emerald-600',
    },
    blue: {
      bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50',
      icon: isDark ? 'text-blue-400' : 'text-blue-600',
    },
    purple: {
      bg: isDark ? 'bg-purple-500/10' : 'bg-purple-50',
      icon: isDark ? 'text-purple-400' : 'text-purple-600',
    },
    orange: {
      bg: isDark ? 'bg-orange-500/10' : 'bg-orange-50',
      icon: isDark ? 'text-orange-400' : 'text-orange-600',
    },
  };

  const handleClick = (entry) => {
    if (!onActivityClick) return;
    // Map to legacy activity shape for handleActivityClick
    const typeMap = {
      devis: 'devis',
      facture: 'devis',
      acompte: 'devis',
      chantier: 'chantier',
      client: 'clients',
    };
    const pageMap = {
      devis: 'devis',
      facture: 'devis',
      acompte: 'devis',
      chantier: 'chantiers',
      client: 'clients',
    };
    onActivityClick({
      id: entry.id,
      itemId: entry.entity_id,
      type: typeMap[entry.entity_type] || entry.entity_type,
      page: pageMap[entry.entity_type] || 'devis',
    });
  };

  return (
    <div
      className={`
        rounded-2xl border overflow-hidden h-full flex flex-col
        transition-shadow duration-200 hover:shadow-md
        ${isDark
          ? 'bg-slate-800 border-slate-700/50'
          : 'bg-white border-gray-100 shadow-sm'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 p-5 pb-4">
        <div
          className={`
            flex items-center justify-center w-9 h-9 rounded-xl
            ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}
          `}
        >
          <Activity size={18} className="text-blue-500" />
        </div>
        <h2 className={`text-base font-semibold flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Activité récente
        </h2>
        {!isLoading && (
          <button
            onClick={loadActivity}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'
            }`}
            title="Rafraîchir"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 px-5 pb-5 overflow-auto">
        {isLoading ? (
          /* Loading skeleton */
          <div className="space-y-2.5">
            {[1, 2, 3].map(i => (
              <div key={i} className={`p-3.5 rounded-xl ${isDark ? 'bg-slate-700/30' : 'bg-gray-50/80'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl animate-pulse ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`} />
                  <div className="flex-1 space-y-2">
                    <div className={`h-3.5 rounded w-3/4 animate-pulse ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`} />
                    <div className={`h-3 rounded w-1/2 animate-pulse ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : entries.length > 0 ? (
          <div className="space-y-2.5">
            {entries.map((entry) => {
              const entityColor = ENTITY_COLORS[entry.entity_type] || 'blue';
              const colors = colorMap[entityColor] || colorMap.blue;
              const IconComp = ENTITY_ICONS[entry.entity_type] || FileText;
              const actionInfo = ACTION_ICONS[entry.action];
              const description = buildDescription(entry);

              // Extract amount from changes if available
              const amount = entry.changes?.total_ht?.new || entry.changes?.total_ttc?.new || entry.changes?.totalHt?.new || null;

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => handleClick(entry)}
                  className={`
                    w-full text-left p-3.5 rounded-xl transition-colors duration-150 cursor-pointer
                    ${isDark ? 'bg-slate-700/30 hover:bg-slate-700/50' : 'bg-gray-50/80 hover:bg-gray-100/80'}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 p-2 rounded-xl ${colors.bg}`}>
                      <IconComp size={16} className={colors.icon} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-snug ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {description}
                      </p>
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {ENTITY_LABELS[entry.entity_type] || entry.entity_type}
                        {entry.metadata?.ref && ` · ${entry.metadata.ref}`}
                      </p>
                      {amount && !modeDiscret && (
                        <p className={`text-sm font-semibold mt-1.5 ${colors.icon}`}>
                          {formatMoney(amount)}
                        </p>
                      )}
                    </div>
                    <span className={`text-[11px] font-medium whitespace-nowrap ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      {formatRelativeTime(entry.created_at)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div
              className={`
                w-14 h-14 rounded-2xl flex items-center justify-center mb-3
                ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'}
              `}
            >
              <Activity size={24} className={isDark ? 'text-slate-500' : 'text-gray-300'} />
            </div>
            <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Aucune activité récente
            </p>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Vos modifications apparaîtront ici
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

export default ActivityFeedWidget;
