import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, CheckCircle, AlertCircle, Loader2, FileText, Shield, ArrowLeft, ExternalLink } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { buildDevisHtml } from '../../lib/devisHtmlBuilder';

/**
 * FacturePaymentPage - Public page for clients to pay invoices online
 * URL: /facture/payer/{token}
 * No authentication required
 */
export default function FacturePaymentPage({ paymentToken }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [factureData, setFactureData] = useState(null);
  const [step, setStep] = useState('preview'); // 'preview' | 'paying' | 'success' | 'already_paid'
  const [redirecting, setRedirecting] = useState(false);
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
    }
  }, [returnStatus]);

  async function fetchFacture() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_facture_for_payment', {
        p_token: paymentToken
      });

      if (rpcError) throw rpcError;

      if (!data) {
        setError('Facture non trouvée');
        return;
      }

      if (data.error === 'already_paid') {
        setFactureData(data);
        setStep('already_paid');
        return;
      }

      if (data.error) {
        setError(data.error);
        return;
      }

      setFactureData(data);
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
  async function handlePay() {
    try {
      setRedirecting(true);

      const { data, error: invokeError } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          payment_token: paymentToken,
          success_url: `${window.location.origin}/facture/payer/${paymentToken}?status=success`,
          cancel_url: `${window.location.origin}/facture/payer/${paymentToken}?status=cancel`
        }
      });

      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
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

  const couleur = factureData?.entreprise?.couleur || '#f97316';
  const formatMoney = (amount) => (amount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: couleur }} />
          <p className="text-slate-500">Chargement de la facture...</p>
        </div>
      </div>
    );
  }

  // ── Error ──
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
  const stripeEnabled = factureData?.stripe?.enabled;

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
          {factureData?.payment_date && (
            <p className="text-sm text-slate-400 mt-2">
              Payée le {new Date(factureData.payment_date).toLocaleDateString('fr-FR')}
            </p>
          )}
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
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-medium">{new Date().toLocaleDateString('fr-FR')}</span>
              </div>
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
            style={{ height: '600px' }}
            sandbox="allow-same-origin"
          />
        </div>
      </div>

      {/* Payment CTA (fixed bottom on mobile) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 sm:relative sm:border-0 sm:shadow-none sm:bg-transparent">
        <div className="max-w-md mx-auto space-y-3">
          {stripeEnabled ? (
            <>
              <button
                onClick={handlePay}
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

              {/* Stripe badge */}
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <Shield className="w-3.5 h-3.5" />
                <span>Paiement sécurisé par Stripe</span>
              </div>
            </>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-sm font-medium text-amber-800 mb-1">Paiement en ligne non disponible</p>
              <p className="text-xs text-amber-600">
                Contactez {entreprise?.nom || 'votre artisan'} pour les modalités de paiement
                {entreprise?.iban && (
                  <span className="block mt-1">IBAN : {entreprise.iban}</span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Spacer for fixed bottom CTA on mobile */}
      <div className="h-28 sm:hidden" />

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
