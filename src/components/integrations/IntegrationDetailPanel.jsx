/**
 * IntegrationDetailPanel.jsx — Slide-over panel showing integration details
 *
 * Shows: provider info, connection status, config, sync history, entity mappings.
 * Actions: manual sync, disconnect, config changes.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  X, RefreshCw, Settings, AlertCircle, CheckCircle2, Clock,
  ExternalLink, ChevronRight, Unplug, History, ArrowUpDown,
  Loader2, BarChart3, Database, Zap, Info,
} from 'lucide-react';
import { getProvider, CATEGORIES } from '../../lib/integrations/providers/index';
import { getSyncLogs, triggerSync } from '../../services/syncService';
import { useConfirm } from '../../context/AppContext';
import SyncHistoryPanel from './SyncHistoryPanel';

export default function IntegrationDetailPanel({
  provider: providerId,
  integration,
  onClose,
  onSync,
  onDisconnect,
  onRefresh,
  isDark,
  couleur,
}) {
  const provider = getProvider(providerId);
  const category = provider ? CATEGORIES[provider.category] : null;
  const { confirm } = useConfirm();

  const [activeTab, setActiveTab] = useState('overview');
  const [syncLogs, setSyncLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncDirection, setSyncDirection] = useState('push');

  // Load sync logs
  const loadSyncLogs = useCallback(async () => {
    if (!integration?.id) return;
    setLoadingLogs(true);
    try {
      const logs = await getSyncLogs(integration.id, { limit: 20 });
      setSyncLogs(logs);
    } catch (err) {
      console.error('Error loading sync logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  }, [integration?.id]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadSyncLogs();
    }
  }, [activeTab, loadSyncLogs]);

  // Handle manual sync
  const handleSync = async (direction) => {
    setSyncing(true);
    try {
      await triggerSync(providerId, { direction });
      if (onSync) onSync(providerId);
      await loadSyncLogs();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setSyncing(false);
    }
  };

  if (!provider) return null;

  const bgCard = isDark ? 'bg-slate-800' : 'bg-white';
  const bgOverlay = isDark ? 'bg-black/60' : 'bg-black/40';
  const bgPanel = isDark ? 'bg-slate-900' : 'bg-gray-50';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const border = isDark ? 'border-slate-700' : 'border-slate-200';

  const statusColors = {
    connected: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Connecté' },
    disconnected: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Déconnecté' },
    error: { bg: 'bg-red-100', text: 'text-red-700', label: 'Erreur' },
    expired: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Expiré' },
    connecting: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Connexion...' },
  };

  const statusInfo = statusColors[integration?.status] || statusColors.disconnected;

  const tabs = [
    { id: 'overview', label: 'Aperçu', icon: Info },
    { id: 'history', label: 'Historique', icon: History },
    { id: 'config', label: 'Configuration', icon: Settings },
  ];

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const timeSince = (dateStr) => {
    if (!dateStr) return 'Jamais';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'À l\'instant';
    if (mins < 60) return `Il y a ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Il y a ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `Il y a ${days}j`;
  };

  return (
    <div className={`fixed inset-0 z-50 flex justify-end ${bgOverlay}`} onClick={onClose}>
      <div
        className={`w-full max-w-lg ${bgPanel} shadow-2xl flex flex-col animate-in slide-in-from-right overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-5 ${bgCard} border-b ${border}`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg"
                style={{ backgroundColor: provider.color || couleur }}
              >
                {provider.name.charAt(0)}
              </div>
              <div>
                <h2 className={`text-lg font-bold ${textPrimary}`}>{provider.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                    {statusInfo.label}
                  </span>
                  {category && (
                    <span className={`text-xs ${textMuted}`}>{category.label}</span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className={`p-2 rounded-lg hover:bg-slate-200 ${textSecondary}`}>
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? `text-white`
                      : `${textSecondary} hover:${isDark ? 'bg-slate-700' : 'bg-slate-100'}`
                  }`}
                  style={isActive ? { backgroundColor: couleur } : undefined}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'overview' && (
            <>
              {/* Provider Info */}
              <div className={`${bgCard} rounded-xl p-4 border ${border}`}>
                <p className={`text-sm ${textSecondary} mb-3`}>{provider.description}</p>
                {provider.website && (
                  <a
                    href={provider.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-xs ${textMuted} hover:underline flex items-center gap-1`}
                  >
                    <ExternalLink size={12} />
                    {provider.website}
                  </a>
                )}
              </div>

              {/* Connection Details */}
              {integration?.status === 'connected' && (
                <div className={`${bgCard} rounded-xl p-4 border ${border}`}>
                  <h3 className={`text-sm font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
                    <Database size={14} />
                    Détails de connexion
                  </h3>
                  <div className="space-y-2">
                    {integration.providerAccountName && (
                      <div className="flex justify-between">
                        <span className={`text-sm ${textSecondary}`}>Compte</span>
                        <span className={`text-sm font-medium ${textPrimary}`}>{integration.providerAccountName}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className={`text-sm ${textSecondary}`}>Connecté depuis</span>
                      <span className={`text-sm ${textPrimary}`}>{formatDate(integration.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-sm ${textSecondary}`}>Dernière sync</span>
                      <span className={`text-sm ${textPrimary}`}>{timeSince(integration.lastSyncAt)}</span>
                    </div>
                    {integration.lastSyncStatus && (
                      <div className="flex justify-between">
                        <span className={`text-sm ${textSecondary}`}>Statut sync</span>
                        <span className={`text-sm flex items-center gap-1 ${
                          integration.lastSyncStatus === 'success' ? 'text-emerald-500' :
                          integration.lastSyncStatus === 'error' ? 'text-red-500' : 'text-amber-500'
                        }`}>
                          {integration.lastSyncStatus === 'success' ? <CheckCircle2 size={12} /> :
                           integration.lastSyncStatus === 'error' ? <AlertCircle size={12} /> :
                           <Clock size={12} />}
                          {integration.lastSyncStatus === 'success' ? 'Succès' :
                           integration.lastSyncStatus === 'error' ? 'Erreur' : 'Partiel'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sync Actions */}
              {integration?.status === 'connected' && (
                <div className={`${bgCard} rounded-xl p-4 border ${border}`}>
                  <h3 className={`text-sm font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
                    <ArrowUpDown size={14} />
                    Synchronisation
                  </h3>

                  {/* Direction selector */}
                  <div className="flex gap-2 mb-3">
                    {['push', 'pull', 'bidirectional'].map(dir => (
                      <button
                        key={dir}
                        onClick={() => setSyncDirection(dir)}
                        className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                          syncDirection === dir
                            ? `border-transparent text-white`
                            : `${border} ${textSecondary} hover:${isDark ? 'bg-slate-700' : 'bg-slate-100'}`
                        }`}
                        style={syncDirection === dir ? { backgroundColor: couleur } : undefined}
                      >
                        {dir === 'push' ? '⬆ Envoyer' : dir === 'pull' ? '⬇ Recevoir' : '⬆⬇ Bidirectionnel'}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => handleSync(syncDirection)}
                    disabled={syncing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium text-sm transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: couleur }}
                  >
                    {syncing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Synchronisation en cours...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={16} />
                        Synchroniser maintenant
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Capabilities */}
              <div className={`${bgCard} rounded-xl p-4 border ${border}`}>
                <h3 className={`text-sm font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
                  <Zap size={14} />
                  Fonctionnalités
                </h3>
                <div className="space-y-2">
                  {(provider.capabilities || []).map(cap => (
                    <div key={cap} className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      <span className={`text-sm ${textSecondary}`}>{formatCapability(cap)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error Details */}
              {integration?.lastSyncError && (
                <div className={`rounded-xl p-4 border ${isDark ? 'bg-red-900/10 border-red-800/30' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-600">Dernière erreur</p>
                      <p className="text-xs text-red-500/80 mt-1">{integration.lastSyncError}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'history' && (
            <SyncHistoryPanel
              syncLogs={syncLogs}
              loading={loadingLogs}
              onRefresh={loadSyncLogs}
              isDark={isDark}
              couleur={couleur}
            />
          )}

          {activeTab === 'config' && (
            <>
              {/* Provider-specific config */}
              <div className={`${bgCard} rounded-xl p-4 border ${border}`}>
                <h3 className={`text-sm font-semibold ${textPrimary} mb-3`}>Configuration</h3>

                {/* Auto-sync toggle */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>Sync automatique</p>
                    <p className={`text-xs ${textMuted}`}>Synchroniser après chaque modification</p>
                  </div>
                  <button
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      integration?.syncEnabled ? '' : isDark ? 'bg-slate-600' : 'bg-slate-300'
                    }`}
                    style={integration?.syncEnabled ? { backgroundColor: couleur } : undefined}
                  >
                    <span className={`absolute top-0.5 ${integration?.syncEnabled ? 'right-0.5' : 'left-0.5'} w-5 h-5 bg-white rounded-full shadow transition-all`} />
                  </button>
                </div>

                {/* Entity type config */}
                {provider.entityTypes && provider.entityTypes.length > 0 && (
                  <div className={`mt-3 pt-3 border-t ${border}`}>
                    <p className={`text-sm font-medium ${textPrimary} mb-2`}>Types synchronisés</p>
                    {provider.entityTypes.map(type => (
                      <div key={type} className="flex items-center gap-2 py-1">
                        <input type="checkbox" defaultChecked className="rounded" style={{ accentColor: couleur }} />
                        <span className={`text-sm ${textSecondary}`}>
                          {type === 'facture' ? 'Factures' :
                           type === 'depense' ? 'Dépenses' :
                           type === 'event' ? 'Événements' :
                           type === 'document' ? 'Documents' : type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Provider-specific config from integration.config */}
                {integration?.config && Object.keys(integration.config).length > 0 && (
                  <div className={`mt-3 pt-3 border-t ${border}`}>
                    <p className={`text-sm font-medium ${textPrimary} mb-2`}>Paramètres provider</p>
                    {Object.entries(integration.config).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-1">
                        <span className={`text-sm ${textSecondary}`}>{key}</span>
                        <span className={`text-sm ${textPrimary}`}>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {integration?.status === 'connected' && (
          <div className={`p-4 border-t ${border} ${bgCard}`}>
            <button
              onClick={async () => {
                if (await confirm({ title: `Déconnecter ${provider.name} ?`, message: 'Les données synchronisées seront conservées.', confirmText: 'Déconnecter', cancelText: 'Annuler', variant: 'danger' })) {
                  onDisconnect(providerId);
                  onClose();
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-red-600 border border-red-200 hover:bg-red-50 font-medium text-sm transition-colors"
            >
              <Unplug size={16} />
              Déconnecter {provider.name}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatCapability(cap) {
  const labels = {
    sync_factures: 'Synchroniser les factures',
    sync_depenses: 'Importer les dépenses',
    rapprochement: 'Rapprochement bancaire automatique',
    sync_events: 'Synchroniser les événements',
    import_events: 'Importer les événements',
    export_events: 'Exporter les événements',
    create_signature: 'Créer des demandes de signature',
    check_status: 'Suivre le statut des signatures',
    download_signed: 'Télécharger les documents signés',
    upload_files: 'Uploader des fichiers',
    auto_backup: 'Sauvegarde automatique',
    folder_structure: 'Structure de dossiers',
    send_webhooks: 'Envoyer des webhooks',
    custom_events: 'Événements personnalisés',
    send_templates: 'Envoyer des templates',
    notifications: 'Notifications automatiques',
    fetch_transactions: 'Récupérer les transactions',
    auto_reconciliation: 'Rapprochement automatique',
  };
  return labels[cap] || cap;
}
