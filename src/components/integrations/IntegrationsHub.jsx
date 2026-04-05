/**
 * IntegrationsHub.jsx — Full integration management page
 *
 * Replaces the cosmetic integration cards in Settings > Comptabilité.
 * Shows all categories with their provider cards.
 * Handles connect/sync/disconnect flows.
 */

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  Search, RefreshCw, Loader2, CheckCircle, Zap, Filter,
} from 'lucide-react';
import supabase, { isDemo } from '../../supabaseClient';
import { useOrg } from '../../context/OrgContext';
import { useConfirm } from '../../context/AppContext';
import {
  PROVIDERS,
  CATEGORIES,
  getCategoryList,
  getProvidersByCategory,
} from '../../lib/integrations/providers/index';
import {
  loadIntegrations,
  connectIntegration,
  disconnectIntegration,
  triggerSync,
  initiateOAuth,
} from '../../services/integrationService';
import IntegrationCard from './IntegrationCard';
import IntegrationConnectModal from './IntegrationConnectModal';
import IntegrationDetailPanel from './IntegrationDetailPanel';
import ICalExportCard from './ICalExportCard';
import WebhookConfigPage from './WebhookConfigPage';

const IntegrationsHub = memo(function IntegrationsHub({
  isDark = false,
  couleur = '#f97316',
  showToast,
  user,
}) {
  const { orgId } = useOrg();
  const { confirm } = useConfirm();

  // State
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [connectingProvider, setConnectingProvider] = useState(null);
  const [syncingProvider, setSyncingProvider] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detailProvider, setDetailProvider] = useState(null);
  const [showWebhookConfig, setShowWebhookConfig] = useState(false);

  const userId = user?.id;

  // Load integrations
  const refreshIntegrations = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await loadIntegrations(supabase, { userId, orgId });
      setIntegrations(data);
    } catch (err) {
      console.error('[IntegrationsHub] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, orgId]);

  useEffect(() => {
    refreshIntegrations();
  }, [refreshIntegrations]);

  // Build integration lookup map
  const integrationMap = useMemo(() => {
    const map = {};
    integrations.forEach(int => {
      map[int.provider] = int;
    });
    return map;
  }, [integrations]);

  // Filter providers
  const filteredProviders = useMemo(() => {
    let providers = Object.values(PROVIDERS);

    // Category filter
    if (activeCategory !== 'all') {
      providers = providers.filter(p => p.category === activeCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      providers = providers.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    return providers;
  }, [activeCategory, searchQuery]);

  // Group by category for display
  const groupedProviders = useMemo(() => {
    if (activeCategory !== 'all') {
      return [{ category: activeCategory, providers: filteredProviders }];
    }

    const groups = [];
    const categoryOrder = Object.keys(CATEGORIES);

    for (const catId of categoryOrder) {
      const catProviders = filteredProviders.filter(p => p.category === catId);
      if (catProviders.length > 0) {
        groups.push({ category: catId, providers: catProviders });
      }
    }

    return groups;
  }, [activeCategory, filteredProviders]);

  // Stats
  const connectedCount = useMemo(() =>
    integrations.filter(i => i.status === 'connected').length,
  [integrations]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleConnect = useCallback(async (providerId, credentials) => {
    setIsProcessing(true);
    try {
      const provider = PROVIDERS[providerId];

      if (credentials?.authType === 'oauth2') {
        // OAuth flow
        if (isDemo) {
          // In demo mode, simulate connection
          await connectIntegration(supabase, {
            provider: providerId,
            userId,
            orgId,
            providerAccountName: `${provider.name} Démo`,
          });
          showToast?.(`${provider.name} connecté (démo)`, 'success');
        } else {
          // Initiate real OAuth
          const redirectUri = `${window.location.origin}/oauth/callback`;
          const result = await initiateOAuth(supabase, { provider: providerId, redirectUri });

          if (result.url) {
            // Open OAuth popup
            const popup = window.open(result.url, '_blank', 'width=600,height=700');
            if (!popup) {
              showToast?.('Veuillez autoriser les popups pour continuer', 'error');
            }
            // The callback will complete the flow
          } else if (result.demoMode) {
            await connectIntegration(supabase, {
              provider: providerId,
              userId,
              orgId,
              providerAccountName: `${provider.name} Démo`,
            });
            showToast?.(`${provider.name} connecté`, 'success');
          }
        }
      } else {
        // API key flow
        await connectIntegration(supabase, {
          provider: providerId,
          userId,
          orgId,
          apiKey: credentials?.apiKey,
          providerAccountName: credentials?.providerAccountName,
          config: credentials?.config,
        });
        showToast?.(`${provider.name} connecté`, 'success');
      }

      setConnectingProvider(null);
      await refreshIntegrations();
    } catch (err) {
      showToast?.(`Erreur : ${err.message}`, 'error');
      throw err; // Re-throw for modal error handling
    } finally {
      setIsProcessing(false);
    }
  }, [userId, orgId, showToast, refreshIntegrations]);

  const handleDisconnect = useCallback(async (providerId) => {
    const provider = PROVIDERS[providerId];
    const confirmed = await confirm({
      title: `Déconnecter ${provider.name} ?`,
      message: 'Les données synchronisées seront conservées.',
      confirmText: 'Déconnecter',
      cancelText: 'Annuler',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await disconnectIntegration(supabase, { provider: providerId, userId });
      showToast?.(`${provider.name} déconnecté`, 'info');
      await refreshIntegrations();
    } catch (err) {
      showToast?.(`Erreur : ${err.message}`, 'error');
    }
  }, [userId, showToast, refreshIntegrations]);

  const handleSync = useCallback(async (providerId) => {
    const provider = PROVIDERS[providerId];
    setSyncingProvider(providerId);
    try {
      const result = await triggerSync(supabase, {
        provider: providerId,
        direction: 'push',
        userId,
      });
      showToast?.(
        `${provider.name} synchronisé${result.itemsSynced ? ` (${result.itemsSynced} éléments)` : ''}`,
        'success'
      );
      await refreshIntegrations();
    } catch (err) {
      showToast?.(`Erreur de sync : ${err.message}`, 'error');
    } finally {
      setSyncingProvider(null);
    }
  }, [userId, showToast, refreshIntegrations]);

  // ── Theme ─────────────────────────────────────────────────────────────────

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin" style={{ color: couleur }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className={`text-lg font-semibold ${textPrimary}`}>
            Intégrations
          </h2>
          <p className={`text-sm mt-0.5 ${textMuted}`}>
            Connectez vos outils pour automatiser votre gestion.
            {connectedCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1">
                <CheckCircle size={12} className="text-emerald-500" />
                {connectedCount} active{connectedCount > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className={`w-full pl-9 pr-3 py-2 rounded-xl border text-sm ${inputBg}`}
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap flex-shrink-0 ${
            activeCategory === 'all'
              ? 'text-white'
              : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          style={activeCategory === 'all' ? { background: couleur } : {}}
        >
          <Zap size={14} />
          Tout
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
            activeCategory === 'all'
              ? 'bg-white/20'
              : isDark ? 'bg-slate-600' : 'bg-gray-200'
          }`}>
            {Object.keys(PROVIDERS).length}
          </span>
        </button>

        {getCategoryList().map((cat) => {
          const CatIcon = cat.icon;
          const count = getProvidersByCategory(cat.id).length;
          const connectedInCat = integrations.filter(
            i => i.category === cat.id && i.status === 'connected'
          ).length;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                activeCategory === cat.id
                  ? 'text-white'
                  : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={activeCategory === cat.id ? { background: cat.color } : {}}
            >
              <CatIcon size={14} />
              {cat.label}
              {connectedInCat > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeCategory === cat.id
                    ? 'bg-white/20'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {connectedInCat}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Provider groups */}
      {groupedProviders.map(({ category, providers }) => {
        const cat = CATEGORIES[category];
        if (!cat) return null;
        const CatIcon = cat.icon;

        return (
          <div key={category} className="space-y-3">
            {/* Category header (only when showing all) */}
            {activeCategory === 'all' && (
              <div className="flex items-center gap-2 pt-2">
                <CatIcon size={16} style={{ color: cat.color }} />
                <h3 className={`text-sm font-semibold ${textPrimary}`}>
                  {cat.label}
                </h3>
                <span className={`text-xs ${textMuted}`}>
                  {cat.description}
                </span>
              </div>
            )}

            {/* Provider cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {providers.map((provider) => (
                <IntegrationCard
                  key={provider.id}
                  provider={provider}
                  integration={integrationMap[provider.id]}
                  onConnect={(id) => {
                    const prov = PROVIDERS[id];
                    if (prov?.isConfigPage) {
                      setShowWebhookConfig(true);
                    } else {
                      setConnectingProvider(id);
                    }
                  }}
                  onSync={handleSync}
                  onDisconnect={handleDisconnect}
                  onDetails={(id) => setDetailProvider(id)}
                  isDark={isDark}
                  couleur={couleur}
                />
              ))}
            </div>

            {/* iCal export card in calendar category */}
            {category === 'calendar' && (
              <ICalExportCard isDark={isDark} couleur={couleur} />
            )}

            {/* Webhook config in automation category */}
            {category === 'automation' && showWebhookConfig && (
              <WebhookConfigPage
                userId={userId}
                isDark={isDark}
                couleur={couleur}
                showToast={showToast}
                onClose={() => setShowWebhookConfig(false)}
              />
            )}
          </div>
        );
      })}

      {/* Empty state */}
      {filteredProviders.length === 0 && (
        <div className={`text-center py-12 rounded-2xl border ${cardBg}`}>
          <Search size={40} className={`mx-auto mb-3 ${textMuted}`} />
          <p className={`font-medium ${textPrimary}`}>Aucune intégration trouvée</p>
          <p className={`text-sm mt-1 ${textMuted}`}>
            Essayez un autre terme de recherche
          </p>
        </div>
      )}

      {/* GoCardless notice (already connected separately) */}
      {activeCategory === 'all' || activeCategory === 'banking' ? (
        <div className={`rounded-2xl border p-4 ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-white'}`}>
              <CheckCircle size={16} className="text-emerald-500" />
            </div>
            <div>
              <p className={`text-sm font-medium ${textPrimary}`}>
                GoCardless — Connexion bancaire
              </p>
              <p className={`text-xs ${textMuted}`}>
                Déjà configuré dans Paramètres → Banque. Gère la connexion bancaire et le rapprochement.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Connect modal */}
      {connectingProvider && (
        <IntegrationConnectModal
          providerId={connectingProvider}
          onConnect={handleConnect}
          onClose={() => setConnectingProvider(null)}
          isDark={isDark}
          couleur={couleur}
          isProcessing={isProcessing}
        />
      )}

      {/* Detail panel */}
      {detailProvider && (
        <IntegrationDetailPanel
          provider={detailProvider}
          integration={integrationMap[detailProvider]}
          onClose={() => setDetailProvider(null)}
          onSync={handleSync}
          onDisconnect={handleDisconnect}
          onRefresh={refreshIntegrations}
          isDark={isDark}
          couleur={couleur}
        />
      )}
    </div>
  );
});

export default IntegrationsHub;
