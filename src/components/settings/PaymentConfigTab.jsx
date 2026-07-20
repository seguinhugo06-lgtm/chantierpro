import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Building2, Shield, CheckCircle, XCircle, ExternalLink,
  AlertTriangle, Loader2, Info, ToggleLeft, ToggleRight, Lock, Zap, KeyRound,
} from 'lucide-react';
import supabase, { isDemo } from '../../supabaseClient';

/**
 * PaymentConfigTab — Settings > Finance > Paiements en ligne
 *
 * L'artisan colle sa clé secrète Stripe (sk_test_/sk_live_), stockée chiffrée
 * dans le Vault Supabase via la RPC store_stripe_key. Les paiements de ses
 * factures (page publique /pay/:token) passent alors par SON compte Stripe.
 *
 * 2 sections :
 * 1. Clé API Stripe (connexion, activation, frais)
 * 2. Récapitulatif des moyens de paiement
 */
export default function PaymentConfigTab({ entreprise, isDark, couleur = '#F97316', user }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [keyError, setKeyError] = useState(null);
  const [keySaved, setKeySaved] = useState(false);

  // Theme
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300';

  // Load payment config from stripe_config
  const loadConfig = useCallback(async () => {
    if (isDemo || !supabase || !user?.id) {
      setConfig({ stripe_enabled: false, commission_model: 'artisan', has_key: false });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('stripe_config')
        .select('stripe_enabled, commission_model, secret_key_vault_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      setConfig({
        stripe_enabled: data?.stripe_enabled || false,
        commission_model: data?.commission_model || 'artisan',
        has_key: !!data?.secret_key_vault_id,
      });
    } catch (err) {
      console.warn('[PaymentConfig] Load error:', err?.message || err);
      setConfig({ stripe_enabled: false, commission_model: 'artisan', has_key: false });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Enregistre la clé API dans le Vault (RPC store_stripe_key)
  const handleSaveKey = async () => {
    const key = apiKey.trim();
    setKeyError(null);

    if (!key.startsWith('sk_test_') && !key.startsWith('sk_live_')) {
      setKeyError('La clé doit commencer par sk_test_ ou sk_live_. Vous la trouverez dans votre Dashboard Stripe > Développeurs > Clés API.');
      return;
    }

    if (isDemo || !supabase) {
      setKeyError('Non disponible en mode démo.');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('store_stripe_key', { p_secret_key: key });
      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error || 'Enregistrement refusé');

      setApiKey('');
      setShowKeyForm(false);
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 4000);
      await loadConfig();
    } catch (err) {
      setKeyError(err?.message || 'Erreur lors de l\'enregistrement de la clé');
    } finally {
      setSaving(false);
    }
  };

  // Active/désactive le paiement en ligne, change le modèle de frais
  const updateStripeConfig = async ({ enabled, commissionModel }) => {
    if (isDemo || !supabase) {
      setConfig(prev => ({
        ...prev,
        ...(enabled !== undefined ? { stripe_enabled: enabled } : {}),
        ...(commissionModel ? { commission_model: commissionModel } : {}),
      }));
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc('update_stripe_config', {
        p_enabled: enabled ?? null,
        p_commission_model: commissionModel ?? null,
      });
      if (error) throw error;
      setConfig(prev => ({
        ...prev,
        ...(enabled !== undefined ? { stripe_enabled: enabled } : {}),
        ...(commissionModel ? { commission_model: commissionModel } : {}),
      }));
    } catch (err) {
      console.error('[PaymentConfig] Update error:', err?.message || err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin" style={{ color: couleur }} />
      </div>
    );
  }

  const isActive = config?.has_key && config?.stripe_enabled;
  const absorbFees = config?.commission_model !== 'client';

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
              Chaque facture a un lien de paiement <span className="font-mono text-xs">/pay/…</span> :
              vos clients paient par carte, la facture passe en « payée » automatiquement
              et vous êtes notifié par email. Le virement bancaire reste toujours disponible.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                isActive
                  ? (isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700')
                  : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500')
              }`}>
                <CreditCard size={12} />
                CB {isActive ? '✓' : '—'}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
              }`}>
                <Building2 size={12} />
                Virement {entreprise?.iban ? '✓' : '—'}
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
              En mode démo, la connexion Stripe n'est pas fonctionnelle. Passez en mode production pour activer les paiements.
            </p>
          </div>
        </div>
      )}

      {/* ── Section 1: Clé API Stripe ──────────────── */}
      <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
        <div className="p-5 border-b" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-500/10">
              <CreditCard size={20} className="text-indigo-500" />
            </div>
            <div className="flex-1">
              <h4 className={`font-semibold ${textPrimary}`}>Carte bancaire — Stripe</h4>
              <p className={`text-xs ${textMuted}`}>Visa, Mastercard… l'argent arrive directement sur votre compte Stripe</p>
            </div>
            {isActive && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
              }`}>
                <CheckCircle size={14} />
                Activé
              </span>
            )}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {keySaved && (
            <div className={`rounded-xl p-3 flex items-center gap-2 ${isDark ? 'bg-emerald-900/30 border border-emerald-800' : 'bg-emerald-50 border border-emerald-200'}`}>
              <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
              <p className={`text-sm ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                Clé enregistrée — le paiement en ligne est activé.
              </p>
            </div>
          )}

          {(!config?.has_key || showKeyForm) ? (
            <>
              {/* Key entry */}
              <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <div className="flex items-start gap-3">
                  <Info size={16} className={`flex-shrink-0 mt-0.5 ${textMuted}`} />
                  <div className={`text-sm ${textSecondary}`}>
                    <p className="font-medium mb-1">Comment ça marche ?</p>
                    <ul className="space-y-1 text-xs list-disc ml-4">
                      <li>Créez un compte sur <span className="font-medium">stripe.com</span> (gratuit, ~5 minutes)</li>
                      <li>Copiez votre <span className="font-medium">clé secrète</span> depuis Dashboard &gt; Développeurs &gt; Clés API</li>
                      <li>Elle est stockée chiffrée (coffre-fort Supabase Vault), jamais visible dans l'application</li>
                      <li>Vos clients paient sur une page sécurisée Stripe — frais Stripe : ~1,5 % + 0,25 € par transaction</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
                  Clé secrète Stripe
                </label>
                <div className="relative">
                  <KeyRound size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${textMuted}`} />
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => { setApiKey(e.target.value); setKeyError(null); }}
                    placeholder="sk_live_… ou sk_test_…"
                    autoComplete="off"
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl font-mono text-sm ${inputBg}`}
                  />
                </div>
                {keyError && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-start gap-1">
                    <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                    {keyError}
                  </p>
                )}
                <a
                  href="https://dashboard.stripe.com/apikeys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 text-xs mt-1.5 hover:underline ${textMuted}`}
                >
                  Ouvrir mes clés API Stripe
                  <ExternalLink size={11} />
                </a>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveKey}
                  disabled={saving || !apiKey.trim() || isDemo}
                  className="flex-1 py-3.5 px-6 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all hover:shadow-lg disabled:opacity-50 bg-indigo-600 hover:bg-indigo-700"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                  {config?.has_key ? 'Remplacer la clé' : 'Activer le paiement en ligne'}
                </button>
                {showKeyForm && (
                  <button
                    onClick={() => { setShowKeyForm(false); setApiKey(''); setKeyError(null); }}
                    className={`px-4 py-3.5 rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                  >
                    Annuler
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Connected state */}
              <div className={`rounded-xl p-4 flex items-center gap-3 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <Lock size={16} className="text-emerald-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${textPrimary}`}>Clé Stripe enregistrée</p>
                  <p className={`text-xs ${textMuted}`}>Stockée chiffrée dans le coffre-fort — sk_••••••••••••</p>
                </div>
                <button
                  onClick={() => setShowKeyForm(true)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg ${isDark ? 'bg-slate-600 hover:bg-slate-500 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                >
                  Remplacer
                </button>
              </div>

              {/* Enabled toggle */}
              <div className={`rounded-xl p-4 flex items-center justify-between ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <div className="flex-1 mr-4">
                  <p className={`text-sm font-medium ${textPrimary}`}>Paiement en ligne actif</p>
                  <p className={`text-xs ${textMuted} mt-0.5`}>
                    {config.stripe_enabled
                      ? 'Le bouton « Payer par carte » est proposé à vos clients.'
                      : 'Désactivé — vos clients ne voient pas le bouton de paiement par carte.'}
                  </p>
                </div>
                <button
                  onClick={() => updateStripeConfig({ enabled: !config.stripe_enabled })}
                  className="flex-shrink-0"
                  aria-label={config.stripe_enabled ? 'Désactiver le paiement en ligne' : 'Activer le paiement en ligne'}
                >
                  {config.stripe_enabled ? (
                    <ToggleRight size={32} style={{ color: couleur }} />
                  ) : (
                    <ToggleLeft size={32} className={textMuted} />
                  )}
                </button>
              </div>

              {/* Absorb fees toggle */}
              <div className={`rounded-xl p-4 flex items-center justify-between ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <div className="flex-1 mr-4">
                  <p className={`text-sm font-medium ${textPrimary}`}>Absorber les frais de transaction</p>
                  <p className={`text-xs ${textMuted} mt-0.5`}>
                    {absorbFees
                      ? 'Le client paie le montant exact de la facture. Vous prenez les frais à votre charge.'
                      : 'Des frais de 1,7 % sont ajoutés au montant payé par le client.'}
                  </p>
                </div>
                <button
                  onClick={() => updateStripeConfig({ commissionModel: absorbFees ? 'client' : 'artisan' })}
                  className="flex-shrink-0"
                  aria-label={absorbFees ? 'Faire payer les frais au client' : 'Absorber les frais'}
                >
                  {absorbFees ? (
                    <ToggleRight size={32} style={{ color: couleur }} />
                  ) : (
                    <ToggleLeft size={32} className={textMuted} />
                  )}
                </button>
              </div>

              {!absorbFees && (
                <div className={`rounded-xl p-3 flex items-start gap-2 ${isDark ? 'bg-amber-900/20 border border-amber-800' : 'bg-amber-50 border border-amber-200'}`}>
                  <AlertTriangle size={14} className={`flex-shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                  <p className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                    Attention : l'article L.112-12 du Code monétaire interdit les surtaxes pour paiement par carte en France. Veillez à respecter la réglementation.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Section 2: Récapitulatif ──────────────── */}
      <div className={`${cardBg} rounded-2xl border p-5`}>
        <h4 className={`font-semibold mb-4 ${textPrimary}`}>Récapitulatif</h4>

        <div className="space-y-3">
          <div className="grid gap-3">
            <PaymentMethodRow
              icon={<CreditCard size={18} className="text-indigo-500" />}
              label="Carte bancaire"
              description="Visa, Mastercard, Amex"
              enabled={!!isActive}
              fees="1,5% + 0,25€"
              isDark={isDark}
              textPrimary={textPrimary}
              textMuted={textMuted}
            />
            <PaymentMethodRow
              icon={<Building2 size={18} className="text-blue-500" />}
              label="Virement bancaire"
              description="IBAN affiché au client sur la page de paiement"
              enabled={!!(entreprise?.iban)}
              fees="Gratuit"
              isDark={isDark}
              textPrimary={textPrimary}
              textMuted={textMuted}
              alwaysAvailable
            />
          </div>

          {!entreprise?.iban && (
            <div className={`rounded-xl p-3 flex items-start gap-2 ${isDark ? 'bg-amber-900/20 border border-amber-800' : 'bg-amber-50 border border-amber-200'}`}>
              <AlertTriangle size={14} className={`flex-shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
              <p className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                Ajoutez votre IBAN dans Réglages &gt; Banque pour afficher l'option virement sur la page de paiement.
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
                <li>• Paiements sécurisés par Stripe — votre clé est chiffrée dans le Vault</li>
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
