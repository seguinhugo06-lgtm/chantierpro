/**
 * SyncHistoryPanel.jsx — Sync log list with filters and status indicators
 *
 * Shows sync history for an integration: direction, entity type, status,
 * items synced/failed, duration, and error details.
 */

import React, { useState } from 'react';
import {
  RefreshCw, CheckCircle2, AlertCircle, Clock, ArrowUp, ArrowDown,
  ArrowUpDown, Loader2, ChevronDown, ChevronUp, Filter,
} from 'lucide-react';

export default function SyncHistoryPanel({
  syncLogs = [],
  loading = false,
  onRefresh,
  isDark,
  couleur,
}) {
  const [expandedLog, setExpandedLog] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const bgCard = isDark ? 'bg-slate-800' : 'bg-white';
  const border = isDark ? 'border-slate-700' : 'border-slate-200';

  const filteredLogs = statusFilter === 'all'
    ? syncLogs
    : syncLogs.filter(l => l.status === statusFilter);

  const statusConfig = {
    success: { icon: CheckCircle2, color: 'text-emerald-500', bg: isDark ? 'bg-emerald-900/20' : 'bg-emerald-50', label: 'Succès' },
    partial: { icon: AlertCircle, color: 'text-amber-500', bg: isDark ? 'bg-amber-900/20' : 'bg-amber-50', label: 'Partiel' },
    error: { icon: AlertCircle, color: 'text-red-500', bg: isDark ? 'bg-red-900/20' : 'bg-red-50', label: 'Erreur' },
    started: { icon: Loader2, color: 'text-blue-500', bg: isDark ? 'bg-blue-900/20' : 'bg-blue-50', label: 'En cours' },
  };

  const directionIcons = {
    push: { icon: ArrowUp, label: 'Envoi' },
    pull: { icon: ArrowDown, label: 'Réception' },
    bidirectional: { icon: ArrowUpDown, label: 'Bidirectionnel' },
  };

  const formatDuration = (ms) => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}min ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;

    // If today, show time only
    if (diff < 86400000 && d.getDate() === now.getDate()) {
      return `Aujourd'hui ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    // If yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth()) {
      return `Hier ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    // Otherwise full date
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const entityTypeLabels = {
    all: 'Tout',
    facture: 'Factures',
    depense: 'Dépenses',
    event: 'Événements',
    document: 'Documents',
    signature_request: 'Signatures',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin" style={{ color: couleur }} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={14} className={textMuted} />
          <div className="flex gap-1">
            {['all', 'success', 'error', 'started'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'text-white'
                    : `${textSecondary} ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`
                }`}
                style={statusFilter === s ? { backgroundColor: couleur } : undefined}
              >
                {s === 'all' ? 'Tous' :
                 s === 'success' ? 'Succès' :
                 s === 'error' ? 'Erreurs' : 'En cours'}
              </button>
            ))}
          </div>
        </div>
        {onRefresh && (
          <button onClick={onRefresh} className={`p-1.5 rounded-lg ${textMuted} hover:${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      {/* Logs */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-8">
          <Clock size={32} className={`mx-auto mb-2 ${textMuted}`} />
          <p className={`text-sm font-medium ${textSecondary}`}>Aucun historique de synchronisation</p>
          <p className={`text-xs ${textMuted} mt-1`}>Les logs apparaîtront après la première synchronisation</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map(log => {
            const status = statusConfig[log.status] || statusConfig.started;
            const StatusIcon = status.icon;
            const direction = directionIcons[log.direction] || directionIcons.push;
            const DirectionIcon = direction.icon;
            const isExpanded = expandedLog === log.id;

            return (
              <div key={log.id} className={`${bgCard} rounded-xl border ${border} overflow-hidden`}>
                <button
                  onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  className="w-full p-3 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${status.bg}`}>
                        <StatusIcon size={14} className={`${status.color} ${log.status === 'started' ? 'animate-spin' : ''}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <DirectionIcon size={12} className={textMuted} />
                          <span className={`text-sm font-medium ${textPrimary}`}>
                            {direction.label}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-100'} ${textSecondary}`}>
                            {entityTypeLabels[log.entityType] || log.entityType}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-xs ${textMuted}`}>
                            {formatDateTime(log.startedAt)}
                          </span>
                          {log.durationMs > 0 && (
                            <span className={`text-xs ${textMuted}`}>
                              ⏱ {formatDuration(log.durationMs)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(log.itemsSynced > 0 || log.itemsFailed > 0) && (
                        <div className="flex items-center gap-1.5 text-xs">
                          {log.itemsSynced > 0 && (
                            <span className="text-emerald-500 font-medium">✓ {log.itemsSynced}</span>
                          )}
                          {log.itemsFailed > 0 && (
                            <span className="text-red-500 font-medium">✗ {log.itemsFailed}</span>
                          )}
                        </div>
                      )}
                      {isExpanded ? (
                        <ChevronUp size={14} className={textMuted} />
                      ) : (
                        <ChevronDown size={14} className={textMuted} />
                      )}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className={`px-3 pb-3 pt-0 border-t ${border}`}>
                    <div className="pt-3 space-y-2">
                      {/* Summary */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className={textMuted}>Début</span>
                          <p className={textSecondary}>{formatDateTime(log.startedAt)}</p>
                        </div>
                        <div>
                          <span className={textMuted}>Fin</span>
                          <p className={textSecondary}>{formatDateTime(log.completedAt)}</p>
                        </div>
                        <div>
                          <span className={textMuted}>Synchronisés</span>
                          <p className="text-emerald-500 font-medium">{log.itemsSynced || 0}</p>
                        </div>
                        <div>
                          <span className={textMuted}>Échoués</span>
                          <p className={log.itemsFailed > 0 ? 'text-red-500 font-medium' : textSecondary}>{log.itemsFailed || 0}</p>
                        </div>
                      </div>

                      {/* Error message */}
                      {log.errorMessage && (
                        <div className={`p-2 rounded-lg text-xs ${isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
                          {log.errorMessage}
                        </div>
                      )}

                      {/* Details */}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className={`p-2 rounded-lg text-xs font-mono ${isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-600'}`}>
                          {Object.entries(log.details).map(([key, value]) => (
                            <div key={key}>
                              <span className={textMuted}>{key}:</span>{' '}
                              {Array.isArray(value) ? value.join(', ') : JSON.stringify(value)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
