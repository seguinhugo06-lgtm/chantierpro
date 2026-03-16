/**
 * IntegrationCard.jsx — Card for a single integration provider
 *
 * Shows: icon, name, description, status badge, connect/sync/disconnect actions
 * Handles: 'coming_soon', 'available', 'connected', 'error' states
 */

import React, { memo, useState } from 'react';
import {
  CheckCircle, AlertCircle, RefreshCw, Link2, Unlink,
  ExternalLink, Clock, ChevronRight, Loader2,
} from 'lucide-react';

const IntegrationCard = memo(function IntegrationCard({
  provider,
  integration,
  onConnect,
  onSync,
  onDisconnect,
  onDetails,
  isDark = false,
  couleur = '#f97316',
}) {
  const [isHovered, setIsHovered] = useState(false);

  const isConnected = integration?.status === 'connected';
  const isError = integration?.status === 'error';
  const isExpired = integration?.status === 'expired';
  const isConnecting = integration?.status === 'connecting';
  const isComingSoon = provider.status === 'coming_soon';
  const isBeta = provider.status === 'beta';
  const isExternalOnly = provider.isExternalOnly;
  const isConfigPage = provider.isConfigPage;
  const Icon = provider.icon;

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';

  const statusBorderClass = isConnected
    ? isDark ? 'border-emerald-800' : 'border-emerald-200'
    : isError || isExpired
      ? isDark ? 'border-red-800' : 'border-red-200'
      : '';

  const formatLastSync = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <div
      className={`
        ${cardBg} rounded-2xl border overflow-hidden transition-all duration-200
        ${statusBorderClass}
        ${isComingSoon ? 'opacity-75' : 'hover:shadow-lg'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-4 sm:p-5">
        {/* Header: Icon + Name + Status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${provider.color}15` }}
            >
              <Icon size={20} style={{ color: provider.color }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold text-sm ${textPrimary}`}>
                  {provider.name}
                </h3>
                {isComingSoon && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'
                  }`}>
                    Bientôt
                  </span>
                )}
                {isBeta && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                    Bêta
                  </span>
                )}
              </div>
              <p className={`text-xs ${textMuted} line-clamp-1`}>
                {provider.shortDesc || provider.description}
              </p>
            </div>
          </div>

          {/* Status indicator */}
          {isConnected && (
            <CheckCircle size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
          )}
          {(isError || isExpired) && (
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          )}
        </div>

        {/* Connected state: sync info + actions */}
        {isConnected && (
          <div className="space-y-3">
            {/* Account name + last sync */}
            <div className={`flex items-center justify-between text-xs ${textMuted}`}>
              <span className="truncate max-w-[60%]">
                {integration.providerAccountName || 'Connecté'}
              </span>
              {integration.lastSyncAt && (
                <span className="flex items-center gap-1 flex-shrink-0">
                  <Clock size={11} />
                  {formatLastSync(integration.lastSyncAt)}
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => onSync?.(provider.id)}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 text-white transition-colors"
                style={{ background: couleur }}
              >
                <RefreshCw size={13} />
                Synchroniser
              </button>
              {onDetails && (
                <button
                  onClick={() => onDetails?.(provider.id)}
                  className={`py-2 px-3 rounded-xl text-xs transition-colors ${
                    isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <ChevronRight size={13} />
                </button>
              )}
              <button
                onClick={() => onDisconnect?.(provider.id)}
                className={`py-2 px-3 rounded-xl text-xs transition-colors ${
                  isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Déconnecter"
              >
                <Unlink size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Error / Expired state */}
        {(isError || isExpired) && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-red-500">
              <AlertCircle size={12} />
              <span className="truncate">
                {isExpired ? 'Connexion expirée' : integration?.lastSyncError || 'Erreur de connexion'}
              </span>
            </div>
            <button
              onClick={() => onConnect?.(provider.id)}
              className="w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 text-white"
              style={{ background: couleur }}
            >
              <RefreshCw size={13} />
              Reconnecter
            </button>
          </div>
        )}

        {/* Disconnected state: connect button */}
        {!isConnected && !isError && !isExpired && !isComingSoon && !isConnecting && (
          <div>
            {isExternalOnly ? (
              <a
                href={provider.website}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                <ExternalLink size={13} />
                Configurer via Webhooks
              </a>
            ) : isConfigPage ? (
              <button
                onClick={() => onConnect?.(provider.id)}
                className={`w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                <Link2 size={13} />
                Configurer
              </button>
            ) : (
              <button
                onClick={() => onConnect?.(provider.id)}
                className={`w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                <Link2 size={13} />
                Connecter
              </button>
            )}
          </div>
        )}

        {/* Connecting state */}
        {isConnecting && (
          <div className="flex items-center justify-center gap-2 py-2 text-xs">
            <Loader2 size={14} className="animate-spin" style={{ color: couleur }} />
            <span className={textMuted}>Connexion en cours...</span>
          </div>
        )}

        {/* Coming soon state */}
        {isComingSoon && (
          <div className={`text-xs text-center py-2 rounded-xl ${
            isDark ? 'bg-slate-700/50 text-slate-500' : 'bg-gray-50 text-gray-400'
          }`}>
            Disponible prochainement
          </div>
        )}

        {/* Website link (only for non-internal providers) */}
        {provider.website && !isComingSoon && (
          <a
            href={provider.website}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1 mt-3 text-[11px] ${textMuted} hover:underline`}
          >
            <ExternalLink size={10} />
            {provider.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
          </a>
        )}
      </div>
    </div>
  );
});

export default IntegrationCard;
