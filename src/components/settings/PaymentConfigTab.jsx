import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Building2, Shield, ExternalLink, CheckCircle, XCircle,
  AlertTriangle, Loader2, Link2, Unlink, Info, ToggleLeft, ToggleRight,
  RefreshCw, ArrowRight, Globe, Lock, Zap, Landmark, Eye, Copy, Check
} from 'lucide-react';
import supabase, { isDemo } from '../../supabaseClient';

/**
 * PaymentConfigTab — Settings > Finance > Paiements en ligne
 *
 * 3 sections:
 * 1. Stripe Connect Standard (CB payments)
 * 2. GoCardless (SEPA direct debit)
 * 3. Aperçu & options générales
 */

const STRIPE_CONNECT_CLIENT_ID = import.meta.env.VITE_STRIPE_CONNECT_CLIENT_ID || '';
const GOCARDLESS_CLIENT_ID = import.meta.env.VITE_GOCARDLESS_CLIENT_ID || '';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

export default function PaymentConfigTab({ entreprise, isDark, couleur = '#F97316', user, modeDiscret }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testLinkUrl, setTestLinkUrl] = useState(null);

  // Theme
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300';

  // Load payment config from stripe_config
  const loadConfig = useCallback(async () => {
    if (isDemo || !supabase || !user?.id) {
      setConfig({
        stripe_enabled: false,
        stripe_account_id: null,
        stripe_connect_status: 'disconnected',
        stripe_livemode: false,
        absorb_fees: true,
        gocardless_enabled: false,
        gocardless_environment: 'sandbox',
        gocardless_creditor_id: null,
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('stripe_config')
        .select('stripe_enabled, stripe_account_id, stripe_connect_status, stripe_livemode, absorb_fees, gocardless_enabled, gocardless_environment, gocardless_creditor_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      setConfig(data || {
        stripe_enabled: false,
        stripe_account_id: null,
        stripe_connect_status: 'disconnected',
        stripe_livemode: false,
        absorb_fees: true,
        gocardless_enabled: false,
        gocardless_environment: 'sandbox',
        gocardless_creditor_id: null,
      });
    } catch (err) {
      console.error('Error loading payment config:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Handle Stripe Connect callback redirect (URL params)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('stripe_connect=')) {
      const params = new URLSearchParams(hash.split('?')[1] || '');
      const status = params.get('stripe_connect');
      if (status === 'success') {
        loadConfig(); // Reload config after successful connect
      }
      // Clean up URL
      const cleanHash = hash.split('?')[0];
      window.location.hash = cleanHash;
    }
  }, [loadConfig]);

  // Save config field
  const updateConfig = async (updates) => {
    if (isDemo || !supabase || !user?.id) {
      setConfig(prev => ({ ...prev, ...updates }));
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('stripe_config')
        .upsert({
          user_id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;
      setConfig(prev => ({ ...prev, ...updates }));
    } catch (err) {
      console.error('Error updating payment config:', err);
    } finally {
      setSaving(false);
    }
  };

  // Stripe Connect OAuth
  const handleStripeConnect = () => {
    if (!STRIPE_CONNECT_CLIENT_ID || isDemo) {
      alert('Configuration Stripe Connect manquante. Ajoutez VITE_STRIPE_CONNECT_CLIENT_ID dans votre .env');
      return;
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/stripe-connect-callback`;
    const state = user?.id || 'unknown';

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: STRIPE_CONNECT_CLIENT_ID,
      scope: 'read_write',
      redirect_uri: redirectUri,
      state,
      'stripe_user[business_type]': 'company',
      'stripe_user[country]': 'FR',
      'stripe_user[currency]': 'eur',
    });

    window.location.href = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
  };

  // Stripe Disconnect
  const handleStripeDisconnect = async () => {
    if (!confirm('Voulez-vous vraiment déconnecter votre compte Stripe ? Les liens de paiement existants ne fonctionneront plus.')) return;

    await updateConfig({
      stripe_enabled: false,
      stripe_account_id: null,
      stripe_connect_status: 'disconnected',
    });
  };

  // GoCardless Connect OAuth
  const handleGoCardlessConnect = () => {
    if (!GOCARDLESS_CLIENT_ID || isDemo) {
      alert('Configuration GoCardless manquante. Ajoutez VITE_GOCARDLESS_CLIENT_ID dans votre .env');
      return;
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/gocardless-connect`;
    const state = user?.id || 'unknown';
    const env = config?.gocardless_environment === 'live' ? '' : 'sandbox.';

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: GOCARDLESS_CLIENT_ID,
      scope: 'read_write',
      redirect_uri: redirectUri,
      state,
    });

    window.location.href = `https://${env}connect.gocardless.com/oauth/authorize?${params.toString()}`;
  };

  // GoCardless Disconnect
  const handleGoCardlessDisconnect = async () => {
    if (!confirm('Voulez-vous vraiment déconnecter GoCardless ? Les prélèvements SEPA ne fonctionneront plus.')) return;

    await updateConfig({
      gocardless_enabled: false,
      gocardless_creditor_id: null,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin" style={{ color: couleur }} />
      </div>
    );
  }

  const isStripeConnected = config?.stripe_connect_status === 'connected' && config?.stripe_account_id;
  const isGoCardlessConnected = config?.gocardless_enabled && config?.gocardless_creditor_id;
  const hasAnyPaymentMethod = isStripeConnected || isGoCardlessConnected;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`${cardBg} rounded-2xl border p-5`}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}15` }}>
            <CreditCard size={24} style={{ color: couleur }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-lg font-bold ${textPrimary}`}>Paiements en ligne</h3>
            <p className={`text-sm ${textMuted} mt-1`}>
              Permettez à vos clients de payer vos factures en ligne par carte bancaire ou prélèvement SEPA. Le virement bancaire reste toujours disponible.
            </p>
            {/* Status badges */}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                isStripeConnected
                  ? (isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700')
                  : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500')
              }`}>
                <CreditCard size={12} />
                CB {isStripeConnected ? '✓' : '—'}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                isGoCardlessConnected
                  ? (isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700')
                  : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500')
              }`}>
                <Landmark size={12} />
                SEPA {isGoCardlessConnected ? '✓' : '—'}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
              }`}>
                <Building2 size={12} />
                Virement ✓
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Demo mode banner */}
      {isDemo && (
        <div className={`rounded-xl p-4 flex items-start gap-3 ${isDark ? 'bg-amber-900/30 border border-amber-700' : 'bg-amber-50 border border-amber-200'}`}>
          <AlertTriangle size={18} className={`flex-shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
          <div>
            <p className={`text-sm font-medium ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>Mode démonstration</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
              En mode démo, les connexions Stripe et GoCardless ne sont pas fonctionnelles. Passez en mode production pour activer les paiements.
            </p>
          </div>
        </div>
      )}

      {/* ── Section 1: Stripe Connect Standard ──────────────── */}
      <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
        <div className="p-5 border-b" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-500/10">
              <CreditCard size={20} className="text-indigo-500" />
            </div>
            <div className="flex-1">
              <h4 className={`font-semibold ${textPrimary}`}>Carte bancaire — Stripe</h4>
              <p className={`text-xs ${textMuted}`}>Visa, Mastercard, American Express via Stripe Connect</p>
            </div>
            {isStripeConnected && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
              }`}>
                <CheckCircle size={14} />
                Connecté
              </span>
            )}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {!isStripeConnected ? (
            <>
              {/* Not connected state */}
              <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <div className="flex items-start gap-3">
                  <Info size={16} className={`flex-shrink-0 mt-0.5 ${textMuted}`} />
                  <div className={`text-sm ${textSecondary}`}>
                    <p className="font-medium mb-1">Comment ça marche ?</p>
                    <ul className="space-y-1 text-xs list-disc ml-4">
                      <li>Connectez votre compte Stripe existant ou créez-en un en 5 minutes</li>
                      <li>Vos clients paient par carte bancaire sur une page sécurisée Stripe</li>
                      <li>L'argent est versé directement sur votre compte bancaire</li>
                      <li>Commission : 1,5% + 0,25€ par transaction</li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={handleStripeConnect}
                disabled={isDemo}
                className="w-full py-3.5 px-6 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all hover:shadow-lg disabled:opacity-50 bg-indigo-600 hover:bg-indigo-700"
              >
                <Zap size={18} />
                Connecter Stripe
                <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <>
              {/* Connected state */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <p className={`text-xs ${textMuted} mb-1`}>Compte Stripe</p>
                  <p className={`text-sm font-mono font-medium ${textPrimary}`}>
                    {modeDiscret ? '••••••••••••' : config.stripe_account_id}
                  </p>
                </div>
                <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <p className={`text-xs ${textMuted} mb-1`}>Mode</p>
                  <p className={`text-sm font-medium flex items-center gap-1.5 ${config.stripe_livemode ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {config.stripe_livemode ? <Globe size={14} /> : <Lock size={14} />}
                    {config.stripe_livemode ? 'Production' : 'Test'}
                  </p>
                </div>
              </div>

              {/* Absorb fees toggle */}
              <div className={`rounded-xl p-4 flex items-center justify-between ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <div className="flex-1 mr-4">
                  <p className={`text-sm font-medium ${textPrimary}`}>Absorber les frais de transaction</p>
                  <p className={`text-xs ${textMuted} mt-0.5`}>
                    {config.absorb_fees !== false
                      ? 'Le client paie le montant exact de la facture. Vous prenez les frais à votre charge.'
                      : 'Les frais sont ajoutés au montant payé par le client.'}
                  </p>
                </div>
                <button
                  onClick={() => updateConfig({ absorb_fees: !config.absorb_fees })}
                  className="flex-shrink-0"
                >
                  {config.absorb_fees !== false ? (
                    <ToggleRight size={32} style={{ color: couleur }} />
                  ) : (
                    <ToggleLeft size={32} className={textMuted} />
                  )}
                </button>
              </div>

              {config.absorb_fees === false && (
                <div className={`rounded-xl p-3 flex items-start gap-2 ${isDark ? 'bg-amber-900/20 border border-amber-800' : 'bg-amber-50 border border-amber-200'}`}>
                  <AlertTriangle size={14} className={`flex-shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                  <p className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                    Attention : l'article L.112-12 du Code monétaire interdit les surtaxes pour paiement par carte en France. Veillez à respecter la réglementation.
                  </p>
                </div>
              )}

              {/* Disconnect button */}
              <button
                onClick={handleStripeDisconnect}
                className={`w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                <Unlink size={14} />
                Déconnecter Stripe
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Section 2: GoCardless (SEPA) ──────────────── */}
      <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
        <div className="p-5 border-b" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-teal-500/10">
              <Landmark size={20} className="text-teal-500" />
            </div>
            <div className="flex-1">
              <h4 className={`font-semibold ${textPrimary}`}>Prélèvement SEPA — GoCardless</h4>
              <p className={`text-xs ${textMuted}`}>Prélèvement automatique sur le compte du client</p>
            </div>
            {isGoCardlessConnected && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
              }`}>
                <CheckCircle size={14} />
                Connecté
              </span>
            )}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {!isGoCardlessConnected ? (
            <>
              <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <div className="flex items-start gap-3">
                  <Info size={16} className={`flex-shrink-0 mt-0.5 ${textMuted}`} />
                  <div className={`text-sm ${textSecondary}`}>
                    <p className="font-medium mb-1">Prélèvement SEPA</p>
                    <ul className="space-y-1 text-xs list-disc ml-4">
                      <li>Le client autorise un prélèvement via son IBAN</li>
                      <li>Idéal pour les paiements récurrents et les gros montants</li>
                      <li>Frais réduits : 0,2% + 0,20€ par transaction (max 5€)</li>
                      <li>Délai d'encaissement : 3-5 jours ouvrés</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Environment toggle */}
              <div className={`rounded-xl p-4 flex items-center justify-between ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <div>
                  <p className={`text-sm font-medium ${textPrimary}`}>Environnement</p>
                  <p className={`text-xs ${textMuted}`}>
                    {config?.gocardless_environment === 'live' ? 'Production — prélèvements réels' : 'Sandbox — tests uniquement'}
                  </p>
                </div>
                <button
                  onClick={() => updateConfig({
                    gocardless_environment: config?.gocardless_environment === 'live' ? 'sandbox' : 'live'
                  })}
                  className="flex-shrink-0"
                >
                  {config?.gocardless_environment === 'live' ? (
                    <ToggleRight size={32} className="text-emerald-500" />
                  ) : (
                    <ToggleLeft size={32} className={textMuted} />
                  )}
                </button>
              </div>

              <button
                onClick={handleGoCardlessConnect}
                disabled={isDemo}
                className="w-full py-3.5 px-6 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all hover:shadow-lg disabled:opacity-50 bg-teal-600 hover:bg-teal-700"
              >
                <Landmark size={18} />
                Connecter GoCardless
                <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <>
              {/* Connected state */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <p className={`text-xs ${textMuted} mb-1`}>Creditor ID</p>
                  <p className={`text-sm font-mono font-medium ${textPrimary}`}>
                    {modeDiscret ? '••••••••••••' : config.gocardless_creditor_id}
                  </p>
                </div>
                <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <p className={`text-xs ${textMuted} mb-1`}>Environnement</p>
                  <p className={`text-sm font-medium flex items-center gap-1.5 ${config.gocardless_environment === 'live' ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {config.gocardless_environment === 'live' ? <Globe size={14} /> : <Lock size={14} />}
                    {config.gocardless_environment === 'live' ? 'Production' : 'Sandbox'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleGoCardlessDisconnect}
                className={`w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                <Unlink size={14} />
                Déconnecter GoCardless
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Section 3: Aperçu & Options ──────────────── */}
      <div className={`${cardBg} rounded-2xl border p-5`}>
        <h4 className={`font-semibold mb-4 ${textPrimary}`}>Récapitulatif</h4>

        <div className="space-y-3">
          {/* Méthodes disponibles */}
          <div className="grid gap-3">
            <PaymentMethodRow
              icon={<CreditCard size={18} className="text-indigo-500" />}
              label="Carte bancaire"
              description="Visa, Mastercard, Amex"
              enabled={!!isStripeConnected}
              fees="1,5% + 0,25€"
              isDark={isDark}
              textPrimary={textPrimary}
              textMuted={textMuted}
            />
            <PaymentMethodRow
              icon={<Landmark size={18} className="text-teal-500" />}
              label="Prélèvement SEPA"
              description="Débit direct (IBAN)"
              enabled={!!isGoCardlessConnected}
              fees="0,2% + 0,20€ (max 5€)"
              isDark={isDark}
              textPrimary={textPrimary}
              textMuted={textMuted}
            />
            <PaymentMethodRow
              icon={<Building2 size={18} className="text-blue-500" />}
              label="Virement bancaire"
              description="IBAN affiché au client"
              enabled={!!(entreprise?.iban)}
              fees="Gratuit"
              isDark={isDark}
              textPrimary={textPrimary}
              textMuted={textMuted}
              alwaysAvailable
            />
          </div>

          {/* Missing IBAN warning */}
          {!entreprise?.iban && (
            <div className={`rounded-xl p-3 flex items-start gap-2 ${isDark ? 'bg-amber-900/20 border border-amber-800' : 'bg-amber-50 border border-amber-200'}`}>
              <AlertTriangle size={14} className={`flex-shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
              <p className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                Ajoutez votre IBAN dans Settings &gt; Banque pour afficher l'option virement sur la page de paiement.
              </p>
            </div>
          )}
        </div>

        {/* Security note */}
        <div className={`mt-5 pt-5 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex items-start gap-3">
            <Shield size={16} className={`flex-shrink-0 mt-0.5 ${textMuted}`} />
            <div className={`text-xs ${textMuted}`}>
              <p className="font-medium mb-1">Sécurité & conformité</p>
              <ul className="space-y-0.5">
                <li>• PCI DSS SAQ-A : aucune donnée carte ne transite par BatiGesti</li>
                <li>• Authentification forte (SCA/3D Secure) conforme PSD2</li>
                <li>• Paiements sécurisés par Stripe et GoCardless</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {saving && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-sm ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-white text-slate-700'}`}>
            <Loader2 size={14} className="animate-spin" style={{ color: couleur }} />
            Enregistrement...
          </div>
        </div>
      )}
    </div>
  );
}

/** Payment method row component */
function PaymentMethodRow({ icon, label, description, enabled, fees, isDark, textPrimary, textMuted, alwaysAvailable }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${textPrimary}`}>{label}</p>
        <p className={`text-xs ${textMuted}`}>{description}</p>
      </div>
      <div className="text-right flex-shrink-0">
        {enabled ? (
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            <CheckCircle size={14} />
            Actif
          </span>
        ) : alwaysAvailable ? (
          <span className={`text-xs ${textMuted}`}>Configurer IBAN</span>
        ) : (
          <span className={`inline-flex items-center gap-1 text-xs ${textMuted}`}>
            <XCircle size={14} />
            Non connecté
          </span>
        )}
      </div>
      <div className={`text-xs ${textMuted} hidden sm:block w-28 text-right`}>{fees}</div>
    </div>
  );
}
