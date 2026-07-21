import React, { useState, useEffect } from 'react';
import {
  CreditCard, CheckCircle, AlertCircle, Loader2, Shield, Building2,
  Copy, Check, Receipt, Info,
} from 'lucide-react';
import { supabase, isDemo } from '../../supabaseClient';

/**
 * Page publique de paiement de facture — /pay/:token
 * Accessible sans authentification (RPC get_facture_for_payment + anon key).
 *
 * Flow : récap facture → « Payer par carte » → Stripe Checkout (compte de
 * l'artisan) → retour ?session_id=… → vérification serveur (action verify de
 * create-invoice-payment) → facture marquée payée + artisan notifié.
 */
export default function PublicPaymentPage({ payToken }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);
  const [copied, setCopied] = useState(false);
  // verifying → verified (payé) / verify_failed (session non payée)
  const [verifyState, setVerifyState] = useState(null);
  const [verifiedAmount, setVerifiedAmount] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');
  const wasCanceled = params.get('canceled') === 'true';
  const montantParam = parseInt(params.get('m') || '', 10); // acompte en centimes

  const isDemoToken = payToken.startsWith('demo_') || isDemo || !supabase;

  const formatMoney = (n) => (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €';
  const formatDate = (d) => d
    ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d))
    : null;

  // ── Chargement de la facture ──────────────────────────────────────
  useEffect(() => {
    if (isDemoToken) { setLoading(false); return; }

    const fetchData = async () => {
      try {
        const { data: result, error: rpcError } = await supabase.rpc('get_facture_for_payment', {
          p_token: payToken,
        });
        if (rpcError) throw rpcError;
        if (!result || result.error) {
          setError(result?.error === 'Token invalide ou expire'
            ? 'Ce lien de paiement est invalide ou a expiré. Contactez votre artisan pour obtenir un nouveau lien.'
            : (result?.error || 'Facture introuvable.'));
        } else {
          setData(result);
        }
      } catch (err) {
        console.error('[PublicPaymentPage] load error:', err);
        setError('Impossible de charger la facture. Veuillez réessayer.');
      }
      setLoading(false);
    };
    fetchData();
  }, [payToken, isDemoToken]);

  // ── Vérification au retour de Stripe Checkout ─────────────────────
  useEffect(() => {
    if (isDemoToken || !sessionId || !data) return;
    if (verifyState) return; // déjà lancé

    const verify = async () => {
      setVerifyState('verifying');
      try {
        const { data: result, error: fnError } = await supabase.functions.invoke('create-invoice-payment', {
          body: { action: 'verify', payment_token: payToken, session_id: sessionId },
        });
        if (fnError) throw fnError;
        if (result?.status === 'paid') {
          setVerifiedAmount(result.amount || null);
          setVerifyState('verified');
        } else {
          setVerifyState('verify_failed');
        }
      } catch (err) {
        console.error('[PublicPaymentPage] verify error:', err);
        setVerifyState('verify_failed');
      }
    };
    verify();
  }, [sessionId, data, isDemoToken, payToken, verifyState]);

  // ── Lancement du paiement ─────────────────────────────────────────
  const handlePay = async () => {
    setPaying(true);
    setPayError(null);
    try {
      const body = { action: 'create', payment_token: payToken };
      // Acompte demandé via ?m= (le serveur borne au reste dû)
      if (Number.isInteger(montantParam) && montantParam > 0) body.amount_cents = montantParam;
      const { data: result, error: fnError } = await supabase.functions.invoke('create-invoice-payment', { body });
      if (fnError) {
        // supabase-js masque le corps de la réponse en erreur — on le récupère
        let msg = fnError.message;
        try {
          const ctx = await fnError.context?.json?.();
          if (ctx?.error) msg = ctx.error;
        } catch { /* garde le message générique */ }
        throw new Error(msg);
      }
      if (result?.error) throw new Error(result.error);
      if (!result?.url) throw new Error('Réponse invalide du serveur');
      window.location.href = result.url;
    } catch (err) {
      setPayError(err.message || 'Erreur lors de la création du paiement');
      setPaying(false);
    }
  };

  const copyIban = () => {
    if (!data?.entreprise?.iban) return;
    navigator.clipboard.writeText(data.entreprise.iban.replace(/\s/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── États simples ─────────────────────────────────────────────────

  if (isDemoToken) {
    return (
      <CenteredCard>
        <IconBadge bg="#fef3c7"><Info className="w-8 h-8" style={{ color: '#f59e0b' }} /></IconBadge>
        <h1 className="text-xl font-bold text-slate-900 mb-3">Lien de démonstration</h1>
        <p className="text-slate-600 leading-relaxed">
          Le paiement en ligne n'est pas disponible en mode démo.
          Avec un compte réel, votre client verrait ici le récapitulatif de la
          facture et paierait par carte bancaire en quelques secondes.
        </p>
      </CenteredCard>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 p-4">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
        <p className="text-slate-600 text-sm">Chargement de votre facture...</p>
      </div>
    );
  }

  if (error) {
    return (
      <CenteredCard>
        <IconBadge bg="#fee2e2"><AlertCircle className="w-8 h-8 text-red-500" /></IconBadge>
        <h1 className="text-xl font-bold text-slate-900 mb-3">Lien invalide</h1>
        <p className="text-slate-600 leading-relaxed">{error}</p>
      </CenteredCard>
    );
  }

  const { facture, entreprise } = data;
  const couleur = entreprise?.couleur || '#f97316';
  const totalTTC = facture.total_ttc || 0;
  const dejaPaye = facture.montant_paye || 0;
  const reste = Math.max(totalTTC - dejaPaye, 0);
  const resteCents = Math.round(reste * 100);
  // Acompte demandé via ?m= (borné au reste dû)
  const montantAcompte = Number.isInteger(montantParam) && montantParam > 0 && montantParam < resteCents
    ? montantParam
    : null;
  const montantAPayer = montantAcompte ? montantAcompte / 100 : reste;
  const commissionModel = data.commission_model || 'artisan';
  const fraisPct = commissionModel === 'client' ? 1.7 : commissionModel === 'partage' ? 0.85 : 0;
  const montantDebite = fraisPct ? Math.round(montantAPayer * 100 * (1 + fraisPct / 100)) / 100 : montantAPayer;

  const isPaid = facture.statut === 'payee';

  // ── Vérification en cours / succès ────────────────────────────────
  if (verifyState === 'verifying') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 p-4">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: couleur }} />
        <p className="text-slate-600 text-sm">Confirmation de votre paiement...</p>
      </div>
    );
  }

  if (verifyState === 'verified' || isPaid) {
    return (
      <CenteredCard>
        <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center animate-bounce" style={{ background: `${couleur}15` }}>
          <CheckCircle className="w-10 h-10" style={{ color: couleur }} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {verifyState === 'verified' ? 'Paiement confirmé !' : 'Facture déjà payée'}
        </h1>
        <p className="text-slate-600 mb-6">
          {verifyState === 'verified'
            ? `Votre paiement a bien été reçu. ${entreprise?.nom || 'Votre artisan'} en a été notifié.`
            : 'Cette facture a déjà été réglée. Aucune action supplémentaire n\'est nécessaire.'}
        </p>
        <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2 mb-6">
          <SummaryRow label="Facture" value={facture.numero} />
          {verifyState === 'verified' && verifiedAmount != null && (
            <SummaryRow label="Montant payé" value={formatMoney(verifiedAmount)} bold couleur={couleur} />
          )}
          {verifyState !== 'verified' && (
            <SummaryRow label="Montant TTC" value={formatMoney(totalTTC)} bold couleur={couleur} />
          )}
          {facture.payment_completed_at && (
            <SummaryRow label="Date" value={formatDate(facture.payment_completed_at)} />
          )}
        </div>
        <SecureFooter />
      </CenteredCard>
    );
  }

  // ── Récapitulatif + paiement ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 sm:py-10">
      <div className="max-w-lg mx-auto">
        {/* Entreprise header */}
        <div className="flex items-center gap-3 mb-6">
          {entreprise?.logo_url ? (
            <img src={entreprise.logo_url} alt="" className="w-12 h-12 rounded-xl object-contain bg-white border border-slate-200" />
          ) : (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ background: couleur }}>
              {(entreprise?.nom || 'A').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-bold text-slate-900 truncate">{entreprise?.nom || 'Votre artisan'}</h1>
            <p className="text-xs text-slate-500 truncate">
              {[entreprise?.adresse, entreprise?.code_postal, entreprise?.ville].filter(Boolean).join(', ')}
            </p>
          </div>
        </div>

        {/* Canceled / failed banners */}
        {wasCanceled && !verifyState && (
          <Banner icon={Info} tone="amber">
            Paiement annulé. Vous pouvez réessayer quand vous le souhaitez.
          </Banner>
        )}
        {verifyState === 'verify_failed' && (
          <Banner icon={AlertCircle} tone="red">
            Le paiement n'a pas pu être confirmé. Si vous avez été débité,
            contactez {entreprise?.nom || 'votre artisan'} — sinon, réessayez ci-dessous.
          </Banner>
        )}

        {/* Facture card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-4">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}15` }}>
                  <Receipt size={20} style={{ color: couleur }} />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-slate-900">Facture {facture.numero}</h2>
                  {facture.objet && <p className="text-sm text-slate-500 truncate">{facture.objet}</p>}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
              {facture.date && <span>Émise le {formatDate(facture.date)}</span>}
              {facture.date_echeance && <span>Échéance : {formatDate(facture.date_echeance)}</span>}
            </div>
          </div>

          <div className="p-5 space-y-2">
            <SummaryRow label="Total TTC" value={formatMoney(totalTTC)} />
            {dejaPaye > 0 && (
              <SummaryRow label="Déjà réglé" value={`− ${formatMoney(dejaPaye)}`} />
            )}
            {montantAcompte && (
              <SummaryRow label="Acompte demandé" value={formatMoney(montantAPayer)} />
            )}
            <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
              <span className="text-sm font-medium text-slate-700">À payer</span>
              <span className="text-2xl font-bold" style={{ color: couleur }}>{formatMoney(montantAPayer)}</span>
            </div>
            {fraisPct > 0 && (
              <p className="text-xs text-slate-500 text-right">
                dont frais de paiement en ligne : montant débité {formatMoney(montantDebite)} (+{fraisPct.toLocaleString('fr-FR')} %)
              </p>
            )}
          </div>

          {/* Pay CTA */}
          <div className="p-5 pt-0">
            {data.stripe_enabled ? (
              <>
                {payError && (
                  <div className="rounded-xl p-3 mb-3 flex items-start gap-2 bg-red-50 border border-red-200">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-red-500" />
                    <p className="text-xs text-red-700">{payError}</p>
                  </div>
                )}
                <button
                  onClick={handlePay}
                  disabled={paying || montantAPayer <= 0}
                  className="w-full py-4 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:shadow-lg"
                  style={{ background: couleur }}
                >
                  {paying ? <Loader2 size={20} className="animate-spin" /> : <CreditCard size={20} />}
                  {paying ? 'Redirection...' : `Payer ${formatMoney(montantAPayer)} par carte`}
                </button>
                <p className="text-xs text-slate-400 text-center mt-2">
                  Vous serez redirigé vers une page de paiement sécurisée Stripe.
                </p>
              </>
            ) : (
              <div className="rounded-xl p-4 bg-slate-50 flex items-start gap-3">
                <Info size={18} className="flex-shrink-0 mt-0.5 text-slate-400" />
                <p className="text-sm text-slate-600">
                  Le paiement par carte n'est pas activé pour cette facture.
                  {entreprise?.iban ? ' Vous pouvez régler par virement bancaire ci-dessous.' : ` Contactez ${entreprise?.nom || 'votre artisan'} pour connaître les modalités de règlement.`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Virement fallback */}
        {entreprise?.iban && (
          <div className="bg-white rounded-2xl shadow-lg p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={18} className="text-blue-500" />
              <h3 className="font-semibold text-slate-900 text-sm">
                {data.stripe_enabled ? 'Ou par virement bancaire' : 'Règlement par virement bancaire'}
              </h3>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500">IBAN</p>
                <p className="text-sm font-mono font-medium text-slate-900 break-all">{entreprise.iban}</p>
                {entreprise.bic && <p className="text-xs text-slate-500 mt-1">BIC : {entreprise.bic}</p>}
              </div>
              <button
                onClick={copyIban}
                className="p-2 rounded-lg hover:bg-slate-200 transition-colors flex-shrink-0"
                aria-label="Copier l'IBAN"
              >
                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-slate-500" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Indiquez la référence « {facture.numero} » dans le libellé du virement.
            </p>
          </div>
        )}

        <SecureFooter />
      </div>
    </div>
  );
}

// ── Petits composants internes ──────────────────────────────────────

function CenteredCard({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
        {children}
      </div>
    </div>
  );
}

function IconBadge({ bg, children }) {
  return (
    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: bg }}>
      {children}
    </div>
  );
}

function SummaryRow({ label, value, bold, couleur }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={bold ? 'font-bold' : 'font-medium text-slate-900'} style={bold && couleur ? { color: couleur } : undefined}>
        {value}
      </span>
    </div>
  );
}

function Banner({ icon: Icon, tone, children }) {
  const styles = tone === 'red'
    ? 'bg-red-50 border-red-200 text-red-700'
    : 'bg-amber-50 border-amber-200 text-amber-800';
  const iconColor = tone === 'red' ? 'text-red-500' : 'text-amber-500';
  return (
    <div className={`rounded-xl border p-3 mb-4 flex items-start gap-2 ${styles}`}>
      <Icon size={16} className={`flex-shrink-0 mt-0.5 ${iconColor}`} />
      <p className="text-sm">{children}</p>
    </div>
  );
}

function SecureFooter() {
  return (
    <div className="flex items-center gap-2 justify-center text-xs text-slate-400">
      <Shield className="w-3.5 h-3.5" />
      <span>Paiement sécurisé par Stripe — propulsé par Mallettico</span>
    </div>
  );
}
