import React, { useState, useEffect, useRef } from 'react';
import {
  CreditCard, CheckCircle, AlertCircle, Loader2, FileText, Shield,
  Building2, Landmark, Copy, Check, AlertTriangle, ExternalLink
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { buildDevisHtml } from '../../lib/devisHtmlBuilder';

/**
 * FacturePaymentPage — Public page for clients to pay invoices online
 *
 * URL: /pay/{token} or /facture/payer/{token}
 * No authentication required
 *
 * Multi-method: CB (Stripe), SEPA (GoCardless), Virement (IBAN display)
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export default function FacturePaymentPage({ paymentToken }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [factureData, setFactureData] = useState(null);
  const [step, setStep] = useState('preview'); // 'preview' | 'paying' | 'success' | 'already_paid'
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'sepa' | 'virement'
  const [redirecting, setRedirecting] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);
  const [sepaLoading, setSepaLoading] = useState(false);
  const [sepaForm, setSepaForm] = useState({ iban: '', accountHolder: '', email: '' });
  const [sepaError, setSepaError] = useState(null);
  const [sepaSuccess, setSepaSuccess] = useState(false);
  const iframeRef = useRef(null);

  // Check URL params for return from Stripe
  const urlParams = new URLSearchParams(window.location.search);
  const returnStatus = urlParams.get('status');

  // Fetch facture data on mount
  useEffect(() => {
    fetchFacture();
  }, [paymentToken]);

  // Handle return from Stripe Checkout
  useEffect(() => {
    if (returnStatus === 'success') {
      setStep('success');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (returnStatus === 'cancel') {
      setError('Paiement annulé. Vous pouvez réessayer.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [returnStatus]);

  async function fetchFacture() {
    try {
      setLoading(true);
      setError(null);

      if (!supabase) {
        setError('Service indisponible');
        return;
      }

      // Try new payment_links RPC first, then fall back to old RPC
      let data = null;
      let rpcError = null;

      const result1 = await supabase.rpc('get_payment_link_data', { p_token: paymentToken });
      if (!result1.error && result1.data) {
        data = result1.data;
      } else {
        // Fallback to old RPC
        const result2 = await supabase.rpc('get_facture_for_payment', { p_token: paymentToken });
        if (result2.error) {
          rpcError = result2.error;
        } else {
          data = result2.data;
        }
      }

      if (rpcError) throw rpcError;

      if (!data) {
        setError('Facture non trouvée ou lien expiré');
        return;
      }

      if (data.error === 'already_paid' || data.statut === 'paye') {
        setFactureData(data);
        setStep('already_paid');
        return;
      }

      if (data.error === 'expired' || data.statut === 'expire') {
        setError('Ce lien de paiement a expiré. Contactez votre artisan pour un nouveau lien.');
        return;
      }

      if (data.error) {
        setError(data.error);
        return;
      }

      setFactureData(data);

      // Set default payment method based on what's enabled
      if (data.stripe?.enabled || data.stripe_enabled) {
        setPaymentMethod('card');
      } else if (data.gocardless_enabled) {
        setPaymentMethod('sepa');
      } else {
        setPaymentMethod('virement');
      }
    } catch (err) {
      console.error('Erreur chargement facture:', err);
      setError('Impossible de charger la facture');
    } finally {
      setLoading(false);
    }
  }

  // Inject HTML preview into iframe
  useEffect(() => {
    if (factureData?.facture && iframeRef.current && step === 'preview') {
      const html = buildDevisHtml({
        doc: factureData.facture,
        client: factureData.client,
        entreprise: factureData.entreprise,
        couleur: factureData.entreprise?.couleur || '#f97316'
      });
      const blob = new Blob([html], { type: 'text/html' });
      iframeRef.current.src = URL.createObjectURL(blob);
    }
  }, [factureData, step]);

  // Start Stripe Checkout
  async function handlePayCard() {
    try {
      setRedirecting(true);
      setError(null);

      const functionName = 'create-invoice-payment';
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          payment_token: paymentToken,
          success_url: `${window.location.origin}/pay/${paymentToken}?status=success`,
          cancel_url: `${window.location.origin}/pay/${paymentToken}?status=cancel`,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Erreur');

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de paiement non reçue');
      }
    } catch (err) {
      console.error('Erreur création session:', err);
      setRedirecting(false);
      setError('Impossible de créer la session de paiement. Veuillez réessayer.');
    }
  }

  // Submit SEPA payment
  async function handlePaySepa() {
    if (!sepaForm.iban || !sepaForm.accountHolder) {
      setSepaError('Veuillez remplir l\'IBAN et le nom du titulaire');
      return;
    }

    setSepaLoading(true);
    setSepaError(null);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-sepa-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          payment_link_token: paymentToken,
          iban: sepaForm.iban.replace(/\s/g, ''),
          account_holder: sepaForm.accountHolder,
          email: sepaForm.email,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Erreur');

      setSepaSuccess(true);
    } catch (err) {
      console.error('Erreur SEPA:', err);
      setSepaError(err.message || 'Erreur lors du prélèvement SEPA');
    } finally {
      setSepaLoading(false);
    }
  }

  // Copy IBAN to clipboard
  const copyIban = () => {
    const iban = factureData?.entreprise?.iban;
    if (!iban) return;
    navigator.clipboard.writeText(iban);
    setCopiedIban(true);
    setTimeout(() => setCopiedIban(false), 2000);
  };

  const couleur = factureData?.entreprise?.couleur || '#f97316';
  const formatMoney = (amount) =>
    (amount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  const stripeEnabled = factureData?.stripe?.enabled || factureData?.stripe_enabled;
  const gcEnabled = factureData?.gocardless_enabled;
  const hasIban = !!factureData?.entreprise?.iban;
  const isTestMode = factureData?.stripe?.livemode === false || factureData?.stripe_livemode === false;

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: '#f97316' }} />
          <p className="text-slate-500">Chargement de la facture...</p>
        </div>
      </div>
    );
  }

  // ── Error (no data) ──
  if (error && !factureData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Lien invalide</h1>
          <p className="text-slate-600">{error}</p>
          <p className="text-sm text-slate-400 mt-4">
            Ce lien de paiement est peut-être expiré ou invalide.
            Contactez votre artisan pour obtenir un nouveau lien.
          </p>
        </div>
      </div>
    );
  }

  const facture = factureData?.facture;
  const entreprise = factureData?.entreprise;
  const client = factureData?.client;

  // ── Already Paid ──
  if (step === 'already_paid') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Facture déjà payée</h1>
          <p className="text-slate-600">Cette facture a déjà été réglée.</p>
        </div>
      </div>
    );
  }

  // ── SEPA Success ──
  if (sepaSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Prélèvement initié</h1>
          <p className="text-slate-600 mb-4">
            Votre prélèvement SEPA a été créé avec succès.
            Le montant sera débité de votre compte sous 3 à 5 jours ouvrés.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Facture</span>
              <span className="font-medium">{facture?.numero}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Montant</span>
              <span className="font-bold text-lg" style={{ color: couleur }}>{formatMoney(facture?.total_ttc)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Success (return from Stripe) ──
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6 animate-bounce-once">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Paiement confirmé !</h1>
          <p className="text-slate-600 mb-4">
            Votre paiement a été enregistré avec succès.
          </p>
          {facture && (
            <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Facture</span>
                <span className="font-medium">{facture.numero}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Montant</span>
                <span className="font-bold text-lg" style={{ color: couleur }}>{formatMoney(facture.total_ttc)}</span>
              </div>
              {entreprise?.nom && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Payé à</span>
                  <span className="font-medium">{entreprise.nom}</span>
                </div>
              )}
            </div>
          )}
          <p className="text-sm text-slate-400 mt-6">
            Un email de confirmation vous sera envoyé sous peu.
          </p>
        </div>
      </div>
    );
  }

  // ── Preview + Pay ──
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Test mode banner */}
      {isTestMode && (
        <div className="bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium">
          <AlertTriangle className="inline w-4 h-4 mr-1 -mt-0.5" />
          Mode test — Aucun paiement réel ne sera effectué
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {entreprise?.logo_url ? (
              <img src={entreprise.logo_url} alt={entreprise.nom} className="h-8 w-auto" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: couleur }}>
                {(entreprise?.nom || 'A')[0]}
              </div>
            )}
            <div>
              <p className="font-semibold text-slate-900 text-sm">{entreprise?.nom}</p>
              <p className="text-xs text-slate-500">Facture {facture?.numero}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold" style={{ color: couleur }}>{formatMoney(facture?.total_ttc)}</p>
            <p className="text-xs text-slate-500">TTC</p>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 mt-3">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Invoice preview */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <iframe
            ref={iframeRef}
            title="Aperçu facture"
            className="w-full border-0"
            style={{ height: '500px' }}
            sandbox="allow-same-origin"
          />
        </div>
      </div>

      {/* Payment methods */}
      <div className="max-w-lg mx-auto px-4 pb-8 space-y-4">
        {/* Method tabs */}
        {(stripeEnabled || gcEnabled || hasIban) && (
          <div className="flex gap-2 bg-white rounded-xl p-1.5 shadow-sm">
            {stripeEnabled && (
              <button
                onClick={() => setPaymentMethod('card')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  paymentMethod === 'card' ? 'text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
                style={paymentMethod === 'card' ? { background: couleur } : {}}
              >
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Carte</span>
              </button>
            )}
            {gcEnabled && (
              <button
                onClick={() => setPaymentMethod('sepa')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  paymentMethod === 'sepa' ? 'text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
                style={paymentMethod === 'sepa' ? { background: couleur } : {}}
              >
                <Landmark className="w-4 h-4" />
                <span className="hidden sm:inline">SEPA</span>
              </button>
            )}
            {hasIban && (
              <button
                onClick={() => setPaymentMethod('virement')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  paymentMethod === 'virement' ? 'text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
                style={paymentMethod === 'virement' ? { background: couleur } : {}}
              >
                <Building2 className="w-4 h-4" />
                <span className="hidden sm:inline">Virement</span>
              </button>
            )}
          </div>
        )}

        {/* Card payment */}
        {paymentMethod === 'card' && stripeEnabled && (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            <button
              onClick={handlePayCard}
              disabled={redirecting}
              className="w-full py-4 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all hover:shadow-lg disabled:opacity-60"
              style={{ background: redirecting ? '#94a3b8' : couleur }}
            >
              {redirecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Redirection vers Stripe...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Payer {formatMoney(facture?.total_ttc)} par carte
                </>
              )}
            </button>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <Shield className="w-3.5 h-3.5" />
              <span>Paiement sécurisé par Stripe — Visa, Mastercard, Amex</span>
            </div>
          </div>
        )}

        {/* SEPA payment */}
        {paymentMethod === 'sepa' && gcEnabled && (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">IBAN</label>
              <input
                type="text"
                value={sepaForm.iban}
                onChange={e => setSepaForm(f => ({ ...f, iban: e.target.value.toUpperCase() }))}
                placeholder="FR76 1234 5678 9012 3456 7890 123"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Titulaire du compte</label>
              <input
                type="text"
                value={sepaForm.accountHolder}
                onChange={e => setSepaForm(f => ({ ...f, accountHolder: e.target.value }))}
                placeholder="Jean Dupont"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email <span className="text-slate-400">(optionnel)</span>
              </label>
              <input
                type="email"
                value={sepaForm.email}
                onChange={e => setSepaForm(f => ({ ...f, email: e.target.value }))}
                placeholder="jean@exemple.fr"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            {sepaError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{sepaError}</p>
              </div>
            )}

            <button
              onClick={handlePaySepa}
              disabled={sepaLoading || !sepaForm.iban || !sepaForm.accountHolder}
              className="w-full py-4 text-white rounded-xl font-semibold flex items-center justify-center gap-3 transition-all hover:shadow-lg disabled:opacity-50"
              style={{ background: couleur }}
            >
              {sepaLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <Landmark className="w-5 h-5" />
                  Autoriser le prélèvement de {formatMoney(facture?.total_ttc)}
                </>
              )}
            </button>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <Shield className="w-3.5 h-3.5" />
              <span>Prélèvement SEPA sécurisé — Délai 3-5 jours</span>
            </div>
          </div>
        )}

        {/* Virement (IBAN display) */}
        {paymentMethod === 'virement' && hasIban && (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            <p className="text-sm text-slate-600">
              Effectuez un virement bancaire avec les coordonnées suivantes.
              Indiquez le numéro de facture en référence.
            </p>

            <div className="space-y-3">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">Bénéficiaire</p>
                <p className="font-medium text-slate-900">{entreprise?.nom}</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-slate-500">IBAN</p>
                  <button
                    onClick={copyIban}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                  >
                    {copiedIban ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedIban ? 'Copié' : 'Copier'}
                  </button>
                </div>
                <p className="font-mono font-medium text-slate-900 break-all">{entreprise?.iban}</p>
              </div>

              {entreprise?.bic && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">BIC/SWIFT</p>
                  <p className="font-mono font-medium text-slate-900">{entreprise.bic}</p>
                </div>
              )}

              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">Référence</p>
                <p className="font-medium text-slate-900">{facture?.numero}</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">Montant</p>
                <p className="font-bold text-lg" style={{ color: couleur }}>{formatMoney(facture?.total_ttc)}</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Indiquez bien le numéro de facture <strong>{facture?.numero}</strong> en référence de votre virement pour faciliter le rapprochement.
              </p>
            </div>
          </div>
        )}

        {/* No payment method available */}
        {!stripeEnabled && !gcEnabled && !hasIban && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-sm font-medium text-amber-800 mb-1">Paiement en ligne non disponible</p>
            <p className="text-xs text-amber-600">
              Contactez {entreprise?.nom || 'votre artisan'} pour les modalités de paiement.
            </p>
          </div>
        )}
      </div>

      {/* CSS for bounce animation */}
      <style>{`
        @keyframes bounce-once {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-once {
          animation: bounce-once 0.6s ease-in-out;
        }
      `}</style>
    </div>
  );
}
