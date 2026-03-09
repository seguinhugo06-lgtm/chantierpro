import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * IAUsageCounter — Compact badge showing remaining IA analyses
 *
 * @param {number} used - Number of analyses already used
 * @param {number} limit - Maximum analyses allowed
 * @param {boolean} isLifetime - true = total lifetime (free), false = monthly (pro)
 * @param {boolean} isDark
 * @param {string} couleur
 */
export default function IAUsageCounter({ used, limit, isLifetime = true, isDark = false, couleur = '#f97316' }) {
  if (limit === -1) return null; // Unlimited

  const remaining = Math.max(0, limit - used);
  const pct = limit > 0 ? Math.round((used / limit) * 100) : 100;

  // Color coding
  let dotColor, bgColor, textColor;
  if (pct >= 100) {
    dotColor = '#ef4444';
    bgColor = isDark ? 'bg-red-500/15' : 'bg-red-50';
    textColor = isDark ? 'text-red-300' : 'text-red-700';
  } else if (pct >= 80) {
    dotColor = '#f59e0b';
    bgColor = isDark ? 'bg-amber-500/15' : 'bg-amber-50';
    textColor = isDark ? 'text-amber-300' : 'text-amber-700';
  } else {
    dotColor = '#10b981';
    bgColor = isDark ? 'bg-emerald-500/15' : 'bg-emerald-50';
    textColor = isDark ? 'text-emerald-300' : 'text-emerald-700';
  }

  const barColor = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : couleur;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${bgColor}`}>
      <Sparkles size={14} style={{ color: dotColor }} />
      <span className={`text-xs font-semibold tabular-nums ${textColor}`}>
        {remaining}/{limit}
      </span>
      {/* Mini progress bar */}
      <div className={`w-12 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }}
        />
      </div>
      <span className={`text-[11px] ${textColor}`}>
        {pct >= 100 ? 'épuisées' : isLifetime ? 'restantes' : 'ce mois'}
      </span>
    </div>
  );
}
