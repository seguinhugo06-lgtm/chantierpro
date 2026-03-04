/**
 * RecentActivityWidget
 * Displays recent activity feed on the dashboard.
 *
 * Extracted from Dashboard.jsx for modularity.
 * Shows a scrollable list of recent activities with icons,
 * timestamps, and optional monetary amounts.
 *
 * @module RecentActivityWidget
 */

import React, { memo } from 'react';
import { Activity } from 'lucide-react';

const RecentActivityWidget = memo(function RecentActivityWidget({
  activities,
  isDark,
  formatMoney,
  onActivityClick,
}) {
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
      <div className="flex items-center gap-2.5 p-5 pb-4">
        <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
          <Activity size={18} className="text-blue-500" />
        </div>
        <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Activité récente
        </h3>
      </div>

      <div className="flex-1 px-5 pb-5 overflow-auto">
        {activities?.length > 0 ? (
          <div className="space-y-2.5">
            {activities.map((activity) => {
              const colors = colorMap[activity.color] || colorMap.blue;
              return (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => onActivityClick?.(activity)}
                  className={`
                    w-full text-left p-3.5 rounded-xl transition-colors duration-150 cursor-pointer
                    ${isDark ? 'bg-slate-700/30 hover:bg-slate-700/50' : 'bg-gray-50/80 hover:bg-gray-100/80'}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 p-2 rounded-xl ${colors.bg}`}>
                      {activity.icon && <activity.icon size={16} className={colors.icon} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-snug ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {activity.title}
                      </p>
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {activity.subtitle}
                      </p>
                      {activity.amount && (
                        <p className={`text-sm font-semibold mt-1.5 ${colors.icon}`}>
                          {formatMoney(activity.amount)}
                        </p>
                      )}
                    </div>
                    <span className={`text-[11px] font-medium whitespace-nowrap ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      {(() => {
                        const diff = Date.now() - activity.date.getTime();
                        const hours = Math.floor(diff / 3600000);
                        if (hours < 1) return "À l'instant";
                        if (hours < 24) return `${hours}h`;
                        return 'Hier';
                      })()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
              <Activity size={24} className={isDark ? 'text-slate-500' : 'text-gray-300'} />
            </div>
            <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Aucune activité récente
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

export default RecentActivityWidget;
