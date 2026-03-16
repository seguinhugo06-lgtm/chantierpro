import React, { useState, useEffect } from 'react';
import { History, ChevronRight, Loader2, FileText, Users, Building2, Package, Receipt } from 'lucide-react';
import { getActivityLog, ACTION_LABELS, ENTITY_LABELS } from '../services/activityLogService';

/**
 * ActivityLog — Displays a list of recent user activities (audit trail).
 * Can be used standalone or embedded in a page.
 */
export default function ActivityLog({
  isDark,
  couleur = '#f97316',
  entityType,
  entityId,
  limit = 30,
  compact = false,
}) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  useEffect(() => {
    loadActivities();
  }, [entityType, entityId, limit]);

  const loadActivities = async () => {
    setLoading(true);
    const data = await getActivityLog({ limit, entityType, entityId });
    setActivities(data);
    setLoading(false);
  };

  const ENTITY_ICONS = {
    devis: FileText,
    facture: Receipt,
    client: Users,
    chantier: Building2,
    catalogue: Package,
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `il y a ${diffMin} min`;
    if (diffH < 24) return `il y a ${diffH}h`;
    if (diffD < 7) return `il y a ${diffD}j`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div className={`${compact ? '' : `rounded-2xl border ${cardBg} p-5`}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin" style={{ color: couleur }} />
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={`${compact ? '' : `rounded-2xl border ${cardBg} p-5`}`}>
        {!compact && (
          <div className="flex items-center gap-2 mb-4">
            <History size={18} style={{ color: couleur }} />
            <h3 className={`font-semibold ${textPrimary}`}>Historique</h3>
          </div>
        )}
        <p className={`text-center text-sm py-6 ${textMuted}`}>Aucune activité enregistrée</p>
      </div>
    );
  }

  return (
    <div className={`${compact ? '' : `rounded-2xl border ${cardBg} p-5`}`}>
      {!compact && (
        <div className="flex items-center gap-2 mb-4">
          <History size={18} style={{ color: couleur }} />
          <h3 className={`font-semibold ${textPrimary}`}>Historique</h3>
          <span className={`text-xs ${textMuted}`}>({activities.length})</span>
        </div>
      )}

      <div className="space-y-1">
        {activities.map((act) => {
          const actionInfo = ACTION_LABELS[act.action] || { label: act.action, color: '#94a3b8', emoji: '•' };
          const entityLabel = ENTITY_LABELS[act.entity_type] || act.entity_type;
          const Icon = ENTITY_ICONS[act.entity_type] || FileText;

          return (
            <div
              key={act.id}
              className={`flex items-start gap-3 p-2.5 rounded-xl ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'} transition-colors`}
            >
              {/* Icon */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `${actionInfo.color}15` }}
              >
                <Icon size={14} style={{ color: actionInfo.color }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${textPrimary}`}>
                  <span className="font-medium">{actionInfo.label}</span>
                  {' '}{entityLabel}
                  {act.description && (
                    <span className={textMuted}> — {act.description}</span>
                  )}
                </p>
                <p className={`text-xs ${textMuted}`}>
                  {formatTime(act.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
