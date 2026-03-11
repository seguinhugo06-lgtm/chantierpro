/**
 * RelanceWidget — Dashboard widget showing active reminders overview
 * Displays pending relance count, amount at risk, and top priority items.
 * @module RelanceWidget
 */

import { memo, useMemo } from 'react';
import {
  BellRing,
  AlertTriangle,
  Clock,
  Send,
  ChevronRight,
  Mail,
  MessageSquare,
  Zap,
  CheckCircle2,
} from 'lucide-react';

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

const PRIORITY_COLORS = {
  critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Critique' },
  high: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', label: 'Urgent' },
  medium: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: 'Normal' },
  low: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: 'Amical' },
};

/**
 * @param {Object} props
 * @param {Array} props.pending - Pending relances from useRelances
 * @param {Object} props.stats - Relance stats from useRelances
 * @param {number} props.totalAtRisk - Total amount at risk
 * @param {Function} props.setPage - Navigation function
 * @param {Function} [props.setSelectedDevis] - Select a devis for detail view
 * @param {Function} [props.onRelance] - Quick relance action
 * @param {boolean} props.isDark
 * @param {string} [props.couleur]
 * @param {boolean} [props.modeDiscret]
 * @param {Function} [props.formatMoney]
 */
const RelanceWidget = memo(function RelanceWidget({
  pending = [],
  stats = {},
  totalAtRisk = 0,
  setPage,
  setSelectedDevis,
  onRelance,
  isDark,
  couleur = '#f97316',
  modeDiscret,
  formatMoney: formatMoneyProp,
}) {
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  const showMoney = (v) => {
    if (modeDiscret) return '···';
    if (formatMoneyProp) return formatMoneyProp(v);
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);
  };

  // Sort and take top 5
  const topItems = useMemo(() => {
    return [...pending]
      .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3))
      .slice(0, 5);
  }, [pending]);

  const dueNowCount = pending.filter(p => p.nextStep?.isDue).length;

  // If nothing to show, render a compact "all clear" state
  if (pending.length === 0) {
    return (
      <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: `2px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${couleur}15` }}>
              <BellRing size={16} style={{ color: couleur }} />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${textPrimary}`}>Relances</h3>
              <p className={`text-xs ${textMuted}`}>Aucune relance en attente</p>
            </div>
          </div>
        </div>
        <div className="p-6 text-center">
          <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500" />
          <p className={`text-sm font-medium ${textPrimary}`}>Tout est à jour !</p>
          <p className={`text-xs ${textMuted} mt-1`}>Aucun document ne nécessite de relance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between" style={{ borderBottom: `2px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${couleur}15` }}>
            <BellRing size={16} style={{ color: couleur }} />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${textPrimary}`}>Relances en cours</h3>
            <p className={`text-xs ${textMuted}`}>
              {pending.length} en attente · {showMoney(totalAtRisk)} en jeu
            </p>
          </div>
        </div>
        <button
          onClick={() => setPage?.('devis')}
          className={`text-xs font-medium px-2 py-1 rounded-lg ${isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          Voir tout →
        </button>
      </div>

      {/* KPI Row */}
      <div className={`grid grid-cols-3 gap-px ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
        <div className={`p-3 text-center ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
          <p className={`text-lg font-bold ${textPrimary}`}>{pending.length}</p>
          <p className={`text-[10px] ${textMuted}`}>En attente</p>
        </div>
        <div className={`p-3 text-center ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
          <p className={`text-lg font-bold ${dueNowCount > 0 ? 'text-amber-500' : textPrimary}`}>{dueNowCount}</p>
          <p className={`text-[10px] ${textMuted}`}>À envoyer</p>
        </div>
        <div className={`p-3 text-center ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
          <p className={`text-lg font-bold ${textPrimary}`}>
            {stats.conversionRate != null ? `${stats.conversionRate}%` : '—'}
          </p>
          <p className={`text-[10px] ${textMuted}`}>Taux succès</p>
        </div>
      </div>

      {/* Top items */}
      <div className="p-3 space-y-1.5">
        {topItems.map((item) => {
          const pColor = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.low;
          const clientName = item.client?.nom
            ? `${item.client.prenom || ''} ${item.client.nom}`.trim()
            : item.client?.entreprise || 'Client';
          const stepName = item.nextStep?.step?.name || `J+${item.nextStep?.step?.delay || '?'}`;

          return (
            <div
              key={item.doc.id}
              onClick={() => {
                if (setSelectedDevis) setSelectedDevis(item.doc);
                if (setPage) setPage('devis');
              }}
              className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'
              }`}
            >
              {/* Priority dot */}
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${pColor.bg.replace('bg-', 'bg-').split(' ')[0]}`}
                style={{ backgroundColor: item.priority === 'critical' ? '#ef4444' : item.priority === 'high' ? '#f97316' : item.priority === 'medium' ? '#f59e0b' : '#3b82f6' }}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-semibold truncate ${textPrimary}`}>
                    {item.doc.numero || '—'}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${pColor.bg} ${pColor.text}`}>
                    {stepName}
                  </span>
                </div>
                <p className={`text-[10px] truncate ${textMuted}`}>
                  {clientName} · {showMoney(item.doc.total_ttc || 0)}
                  {item.nextStep?.isDue && (
                    <span className="text-amber-500 font-medium ml-1">
                      · En retard {item.nextStep.daysOverdue}j
                    </span>
                  )}
                </p>
              </div>

              {/* Quick action */}
              {onRelance && item.nextStep?.isDue && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRelance(item); }}
                  className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                  style={{ backgroundColor: `${couleur}15`, color: couleur }}
                  title="Relancer maintenant"
                >
                  <Zap size={12} />
                </button>
              )}

              <ChevronRight size={14} className={textMuted} />
            </div>
          );
        })}
      </div>

      {/* Footer link */}
      {pending.length > 5 && (
        <div className={`px-4 py-2.5 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          <button
            onClick={() => setPage?.('devis')}
            className={`text-xs font-medium w-full text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
          >
            + {pending.length - 5} autres relances en attente
          </button>
        </div>
      )}
    </div>
  );
});

export default RelanceWidget;
