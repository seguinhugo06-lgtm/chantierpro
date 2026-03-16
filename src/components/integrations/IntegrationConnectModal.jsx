/**
 * IntegrationConnectModal.jsx — Modal for connecting an integration
 *
 * Two modes:
 * - OAuth: "Se connecter avec [Provider]" button → opens OAuth popup
 * - API Key: input fields for key/secret → validate and connect
 */

import React, { useState, memo, useCallback } from 'react';
import {
  X, Link2, ExternalLink, Eye, EyeOff, Loader2,
  CheckCircle, AlertCircle, Shield,
} from 'lucide-react';
import { getProvider } from '../../lib/integrations/providers/index';

const IntegrationConnectModal = memo(function IntegrationConnectModal({
  providerId,
  onConnect,
  onClose,
  isDark = false,
  couleur = '#f97316',
  isProcessing = false,
}) {
  const provider = getProvider(providerId);

  const [apiKeyValues, setApiKeyValues] = useState({});
  const [showSecrets, setShowSecrets] = useState({});
  const [error, setError] = useState(null);

  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';

  if (!provider) return null;

  const Icon = provider.icon;
  const isOAuth = provider.authType === 'oauth2';
  const isApiKey = provider.authType === 'api_key';
  const apiKeyFields = provider.apiKeyFields || [
    { key: 'api_key', label: 'Clé API', placeholder: 'Votre clé API...', secret: true },
  ];

  const handleApiKeyConnect = useCallback(async () => {
    setError(null);

    // Validate all required fields
    for (const field of apiKeyFields) {
      const value = apiKeyValues[field.key];
      if (!value || value.trim().length < 3) {
        setError(`${field.label} est requis`);
        return;
      }
    }

    try {
      await onConnect?.(providerId, {
        apiKey: apiKeyValues.api_key || apiKeyValues.secret_key || Object.values(apiKeyValues)[0],
        config: apiKeyValues,
        providerAccountName: apiKeyValues.organization_slug || apiKeyValues.account_name || null,
      });
    } catch (err) {
      setError(err.message || 'Erreur de connexion');
    }
  }, [providerId, apiKeyValues, apiKeyFields, onConnect]);

  const handleOAuthConnect = useCallback(async () => {
    setError(null);
    try {
      await onConnect?.(providerId, { authType: 'oauth2' });
    } catch (err) {
      setError(err.message || 'Erreur OAuth');
    }
  }, [providerId, onConnect]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`
        relative w-full max-w-md rounded-2xl shadow-2xl ${cardBg}
        max-h-[90vh] overflow-y-auto
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4 border-b"
          style={{ borderColor: isDark ? 'rgb(51,65,85)' : 'rgb(229,231,235)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${provider.color}15` }}
            >
              <Icon size={20} style={{ color: provider.color }} />
            </div>
            <div>
              <h2 className={`text-base font-semibold ${textPrimary}`}>
                Connecter {provider.name}
              </h2>
              <p className={`text-xs ${textMuted}`}>
                {provider.description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* OAuth mode */}
          {isOAuth && (
            <div className="space-y-4">
              <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-700/50' : 'bg-blue-50'}`}>
                <div className="flex items-start gap-3">
                  <Shield size={18} className={isDark ? 'text-blue-400 mt-0.5' : 'text-blue-500 mt-0.5'} />
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                      Connexion sécurisée
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-blue-600'}`}>
                      Vous serez redirigé vers {provider.name} pour autoriser l'accès.
                      Vos identifiants ne transitent jamais par BatiGesti.
                    </p>
                  </div>
                </div>
              </div>

              {/* Capabilities */}
              <div>
                <p className={`text-xs font-medium mb-2 ${textMuted}`}>BatiGesti pourra :</p>
                <ul className="space-y-1.5">
                  {provider.capabilities?.map((cap) => (
                    <li key={cap} className={`flex items-center gap-2 text-xs ${textMuted}`}>
                      <CheckCircle size={12} className="text-emerald-500 flex-shrink-0" />
                      {formatCapability(cap)}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={handleOAuthConnect}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 text-white disabled:opacity-50 transition-colors"
                style={{ background: provider.color }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <ExternalLink size={16} />
                    Se connecter avec {provider.name}
                  </>
                )}
              </button>
            </div>
          )}

          {/* API Key mode */}
          {isApiKey && (
            <div className="space-y-4">
              <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-700/50' : 'bg-amber-50'}`}>
                <div className="flex items-start gap-3">
                  <Shield size={18} className={isDark ? 'text-amber-400 mt-0.5' : 'text-amber-500 mt-0.5'} />
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                      Clé API requise
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-amber-600'}`}>
                      Votre clé API est chiffrée et stockée de manière sécurisée.
                      Elle n'est jamais exposée côté client.
                    </p>
                  </div>
                </div>
              </div>

              {/* API key fields */}
              {apiKeyFields.map((field) => (
                <div key={field.key}>
                  <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
                    {field.label}
                  </label>
                  <div className="relative">
                    <input
                      type={field.secret && !showSecrets[field.key] ? 'password' : 'text'}
                      value={apiKeyValues[field.key] || ''}
                      onChange={(e) => setApiKeyValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm ${inputBg} ${
                        field.secret ? 'pr-10' : ''
                      }`}
                    />
                    {field.secret && (
                      <button
                        type="button"
                        onClick={() => setShowSecrets(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 ${textMuted}`}
                      >
                        {showSecrets[field.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Where to find API key */}
              {provider.website && (
                <a
                  href={provider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1.5 text-xs ${textMuted} hover:underline`}
                >
                  <ExternalLink size={11} />
                  Où trouver ma clé API ?
                </a>
              )}

              <button
                onClick={handleApiKeyConnect}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 text-white disabled:opacity-50 transition-colors"
                style={{ background: couleur }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <Link2 size={16} />
                    Connecter
                  </>
                )}
              </button>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatCapability(cap) {
  const labels = {
    sync_factures: 'Synchroniser les factures',
    sync_depenses: 'Synchroniser les dépenses',
    rapprochement: 'Rapprochement bancaire automatique',
    declarations: 'Préparer les déclarations TVA',
    sync_events: 'Synchroniser les événements du calendrier',
    push_chantiers: 'Exporter les chantiers comme événements',
    pull_events: 'Importer les événements du calendrier',
    export_ics: 'Générer un flux iCal',
    sync_transactions: 'Récupérer les transactions bancaires',
    send_signature: 'Envoyer des documents à signer',
    track_status: 'Suivre le statut des signatures',
    download_signed: 'Télécharger les documents signés',
    auto_upload: 'Sauvegarder les PDF automatiquement',
    organize_folders: 'Organiser par client et chantier',
    outgoing_webhooks: 'Envoyer des événements HTTP',
    hmac_signing: 'Signature HMAC pour la sécurité',
    webhook_triggers: 'Déclencher des automatisations',
    send_document: 'Envoyer des documents',
    send_relance: 'Envoyer des relances',
    send_rdv_confirmation: 'Confirmer les rendez-vous',
    multi_bank: 'Connecter plusieurs banques',
    virements: 'Gérer les virements',
  };
  return labels[cap] || cap.replace(/_/g, ' ');
}

export default IntegrationConnectModal;
