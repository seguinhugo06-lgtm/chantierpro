import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Eye } from 'lucide-react';
import { ACTION_LABELS, ACTION_ICONS, ENTITY_LABELS, FIELD_LABELS } from '../../lib/auditService';
import { formatMoney } from '../../lib/formatters';

/**
 * AuditTimeline — Reusable vertical timeline of audit log entries
 *
 * Props:
 *  - entries: Array of audit_log objects
 *  - isDark: boolean
 *  - couleur: string (accent color)
 *  - modeDiscret: boolean
 *  - isLoading: boolean
 *  - emptyMessage: string
 *  - onViewSnapshot: (snapshotId) => void (optional)
 *  - showEntityBadge: boolean (show entity type badge, useful for mixed feeds)
 */
export default function AuditTimeline({
  entries = [],
  isDark,
  couleur,
  modeDiscret,
  isLoading,
  emptyMessage = 'Aucun historique disponible',
  onViewSnapshot,
  showEntityBadge = false,
}) {
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-t-transparent rounded-full" style={{ borderColor: couleur, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <Clock size={40} className={`mb-3 ${textMuted}`} />
        <p className={`text-sm ${textMuted} text-center`}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className={`absolute left-4 top-0 bottom-0 w-px ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

      <div className="space-y-1">
        {entries.map((entry, idx) => (
          <AuditEntry
            key={entry.id || idx}
            entry={entry}
            isDark={isDark}
            couleur={couleur}
            modeDiscret={modeDiscret}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            textMuted={textMuted}
            borderColor={borderColor}
            cardBg={cardBg}
            onViewSnapshot={onViewSnapshot}
            showEntityBadge={showEntityBadge}
            isLast={idx === entries.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function AuditEntry({
  entry,
  isDark,
  couleur,
  modeDiscret,
  textPrimary,
  textSecondary,
  textMuted,
  borderColor,
  cardBg,
  onViewSnapshot,
  showEntityBadge,
}) {
  const [expanded, setExpanded] = useState(false);

  const actionInfo = ACTION_ICONS[entry.action] || ACTION_ICONS.updated;
  const actionLabel = ACTION_LABELS[entry.action] || entry.action;
  const entityLabel = ENTITY_LABELS[entry.entity_type] || entry.entity_type;
  const changes = entry.changes || {};
  const hasChanges = Object.keys(changes).length > 0;
  const hasSnapshot = !!entry.snapshot_id;

  // Build description
  const description = buildDescription(entry, actionLabel);

  return (
    <div className="relative pl-10 pb-4">
      {/* Dot */}
      <div
        className="absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 z-10"
        style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderColor: actionInfo.color,
        }}
      />

      <div className={`rounded-lg p-3 ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'} transition-colors`}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm">{actionInfo.emoji}</span>
              {showEntityBadge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
                  {entityLabel}
                </span>
              )}
              <span className={`text-sm font-medium ${textPrimary}`}>{description}</span>
            </div>

            {/* Status change detail */}
            {entry.action === 'status_changed' && changes.statut && (
              <div className="flex items-center gap-1.5 mt-1 text-xs">
                <span className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
                  {formatStatut(changes.statut.old)}
                </span>
                <span className={textMuted}>→</span>
                <span className="px-1.5 py-0.5 rounded font-medium" style={{ background: `${couleur}20`, color: couleur }}>
                  {formatStatut(changes.statut.new)}
                </span>
              </div>
            )}
          </div>

          {/* Timestamp */}
          <span className={`text-xs whitespace-nowrap ${textMuted}`}>
            {formatRelativeTime(entry.created_at)}
          </span>
        </div>

        {/* User name */}
        {entry.user_name && (
          <p className={`text-xs mt-0.5 ${textMuted}`}>par {entry.user_name}</p>
        )}

        {/* Action buttons */}
        {(hasChanges || hasSnapshot) && (
          <div className="flex items-center gap-2 mt-2">
            {hasChanges && (
              <button
                onClick={() => setExpanded(!expanded)}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
              >
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {Object.keys(changes).length} modification{Object.keys(changes).length > 1 ? 's' : ''}
              </button>
            )}
            {hasSnapshot && onViewSnapshot && (
              <button
                onClick={() => onViewSnapshot(entry.snapshot_id)}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors`}
                style={{ color: couleur }}
              >
                <Eye size={12} />
                Voir la version
              </button>
            )}
          </div>
        )}

        {/* Expanded changes */}
        {expanded && hasChanges && (
          <div className={`mt-2 rounded-lg border p-3 space-y-1.5 ${borderColor} ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
            {Object.entries(changes).map(([field, change]) => {
              if (field === 'statut') return null; // Already shown above
              return (
                <ChangeRow
                  key={field}
                  field={field}
                  change={change}
                  isDark={isDark}
                  textSecondary={textSecondary}
                  textMuted={textMuted}
                  modeDiscret={modeDiscret}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ChangeRow({ field, change, isDark, textSecondary, textMuted, modeDiscret }) {
  const label = FIELD_LABELS[field] || field;

  // Special handling for arrays (lignes) — just show count diff
  if (Array.isArray(change.old) || Array.isArray(change.new)) {
    const oldCount = Array.isArray(change.old) ? change.old.length : 0;
    const newCount = Array.isArray(change.new) ? change.new.length : 0;
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className={`font-medium min-w-[100px] ${textSecondary}`}>{label}</span>
        <span className={textMuted}>
          {oldCount} → {newCount} ligne{newCount > 1 ? 's' : ''}
        </span>
      </div>
    );
  }

  // Money fields
  const isMoneyField = ['total_ht', 'total_ttc', 'totalHt', 'totalTtc', 'montant', 'remise_globale', 'remiseGlobale'].includes(field);

  const formatVal = (val) => {
    if (val === null || val === undefined) return '—';
    if (modeDiscret && isMoneyField) return '•••';
    if (isMoneyField) return formatMoney(val);
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`font-medium min-w-[100px] ${textSecondary}`}>{label}</span>
      <span className={`line-through ${textMuted}`}>{formatVal(change.old)}</span>
      <span className={textMuted}>→</span>
      <span className={textSecondary}>{formatVal(change.new)}</span>
    </div>
  );
}

// ── Helpers ──

function buildDescription(entry, actionLabel) {
  const entityLabel = ENTITY_LABELS[entry.entity_type] || entry.entity_type;

  switch (entry.action) {
    case 'created':
      return `${entityLabel} créé`;
    case 'deleted':
      return `${entityLabel} supprimé`;
    case 'status_changed':
      return `Statut modifié`;
    case 'sent':
      return `${entityLabel} envoyé`;
    case 'signed':
      return `${entityLabel} signé`;
    case 'duplicated':
      return `${entityLabel} dupliqué`;
    case 'restored':
      return `Version restaurée`;
    case 'updated':
      return `${entityLabel} modifié`;
    default:
      return actionLabel;
  }
}

function formatStatut(statut) {
  const labels = {
    brouillon: 'Brouillon',
    envoye: 'Envoyé',
    accepte: 'Accepté',
    signe: 'Signé',
    refuse: 'Refusé',
    expire: 'Expiré',
    acompte_facture: 'Acompte facturé',
    facture: 'Facturé',
    payee: 'Payé',
  };
  return labels[statut] || statut || '—';
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH < 24) return `Il y a ${diffH}h`;
  if (diffD === 1) return 'Hier';
  if (diffD < 7) return `Il y a ${diffD}j`;

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: diffD > 365 ? 'numeric' : undefined });
}
