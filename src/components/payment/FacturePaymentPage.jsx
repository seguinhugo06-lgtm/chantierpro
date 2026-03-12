/**
 * FacturePaymentPage — Public payment page for invoices
 *
 * Accessible via /pay/:token or /facture/payer/:token (no authentication required)
 * Supports: Carte bancaire (Stripe), Prelevement SEPA (GoCardless), Virement (IBAN)
 *
 * @module FacturePaymentPage
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  CreditCard, CheckCircle, XCircle, FileText, Building2, User,
  Loader2, AlertTriangle, Euro, Calendar, Receipt, Copy, Check,
  Landmark, Shield, Clock,
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

function fmtCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount || 0);
}
function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function FacturePaymentPage({ paymentToken }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentError, setPaymentError] = useState(null);
  const [paying, setPaying] = useState(false);
  const [paymentMode, setPaymentMode] = useState('full');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [customAmount, setCustomAmount] = useState('');
  const [copied, setCopied] = useState(false);
  const [sepaIban, setSepaIban] = useState('');
  const [sepaName, setSepaName] = useState('');
  const [sepaEmail, setSepaEmail] = useState('');
  const [sepaProcessing, setSepaProcessing] = useState(false);
  const [sepaSuccess, setSepaSuccess] = useState(false);

  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const isSuccess = urlParams.get('success') === 'true';
  const isCanceled = urlParams.get('canceled') === 'true';

  useEffect(() => {
    if (!paymentToken) { setError('Token de paiement manquant'); setLoading(false); return; }
    if (!supabase) { setError('Configuration Supabase manquante'); setLoading(false); return; }
    loadData();
  }, [paymentToken]);

  async function loadData() {
    try {
      setLoading(true);
      let result = null;
      // Try new RPC (payment_links)
      const { data: linkData, error: linkErr } = await supabase.rpc('get_payment_link_data', { p_token: paymentToken });
      if (!linkErr && linkData && !linkData.error) {
        result = linkData;
      } else {
        // Fallback to old RPC (payment_token on devis)
        const { data: old, error: oldErr } = await supabase.rpc('get_facture_for_payment', { p_token: paymentToken });
        if (oldErr) throw oldErr;
        if (old?.error) { setError(old.error); return; }
        result = {
          facture: old.facture, client: old.client, entreprise: old.entreprise,
          config: { stripe_enabled: old.stripe_enabled, stripe_connected: old.stripe_enabled, absorb_fees: true, gocardless_enabled: false, stripe_livemode: true, commission_model: old.commission_model || 'artisan' },
          link: { montant_centimes: Math.round((old.facture?.total_ttc || 0) * 100), montant_ttc: old.facture?.total_ttc, statut: 'actif', absorb_fees: true, stripe_enabled: old.stripe_enabled, gocardless_enabled: false },
        };
      }
      setData(result);
      if (result?.client?.nom) setSepaName(`${result.client.prenom || ''} ${result.client.nom}`.trim());
      if (result?.client?.email) setSepaEmail(result.client.email);
      const sc = result?.config;
      if (sc?.stripe_enabled || sc?.stripe_connected) setPaymentMethod('card');
      else if (sc?.gocardless_enabled) setPaymentMethod('sepa');
      else setPaymentMethod('virement');
    } catch (err) {
      console.error('Failed to load payment data:', err);
      setError('Impossible de charger la facture. Le lien est peut-etre invalide ou expire.');
    } finally { setLoading(false); }
  }

  async function handlePayCard() {
    if (!data?.facture) return;
    setPaying(true); setPaymentError(null);
    try {
      const totalCents = data.link?.montant_centimes || Math.round((data.facture.total_ttc || 0) * 100);
      const amountCents = paymentMode === 'partial' && customAmount ? Math.round(parseFloat(customAmount) * 100) : totalCents;
      if (amountCents < 50) { setPaymentError('Le montant minimum est de 0,50 EUR'); setPaying(false); return; }
      const res = await fetch(`${supabaseUrl}/functions/v1/create-invoice-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseAnonKey}`, 'apikey': supabaseAnonKey },
        body: JSON.stringify({ payment_token: paymentToken, amount_cents: paymentMode === 'partial' ? amountCents : undefined, payment_link_id: data.link?.id }),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || 'Erreur lors de la creation du paiement');
      if (result.url) window.location.href = result.url;
      else throw new Error('URL de paiement non recue');
    } catch (err) { setPaymentError(err.message); setPaying(false); }
  }

  async function handlePaySepa() {
    if (!data?.facture || !sepaIban || !sepaName) return;
    setSepaProcessing(true); setPaymentError(null);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/create-sepa-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseAnonKey}`, 'apikey': supabaseAnonKey },
        body: JSON.stringify({ payment_link_token: paymentToken, iban: sepaIban, account_holder_name: sepaName, email: sepaEmail }),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || 'Erreur lors du prelevement');
      setSepaSuccess(true);
    } catch (err) { setPaymentError(err.message); } finally { setSepaProcessing(false); }
  }

  function copyIban() {
    const iban = data?.entreprise?.iban;
    if (!iban) return;
    navigator.clipboard.writeText(iban);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const accent = '#f97316';

  // ─── Render States ─────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-3" /><p className="text-slate-500">Chargement de la facture...</p></div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><XCircle className="w-8 h-8 text-red-500" /></div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Lien invalide</h1>
        <p className="text-slate-500">{error}</p>
      </div>
    </div>
  );

  if (isSuccess || sepaSuccess) return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-10 h-10 text-green-500" /></div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">{sepaSuccess ? 'Prelevement initie !' : 'Paiement recu !'}</h1>
        <p className="text-slate-500 mb-4">{sepaSuccess ? 'Votre compte sera debite sous 3 a 5 jours ouvrables.' : 'Merci pour votre paiement. Un recu vous sera envoye par email.'}</p>
        {data?.facture && (
          <div className="bg-green-50 rounded-xl p-4 text-left">
            <p className="text-sm text-green-700"><strong>Facture :</strong> {data.facture.numero}</p>
            <p className="text-sm text-green-700"><strong>Montant :</strong> {fmtCurrency(data.facture.total_ttc)}</p>
          </div>
        )}
      </div>
    </div>
  );

  if (isCanceled) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-8 h-8 text-amber-500" /></div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Paiement annule</h1>
        <p className="text-slate-500 mb-6">Vous avez annule le paiement. Vous pouvez reessayer a tout moment.</p>
        <button onClick={() => { window.location.href = window.location.pathname; }} className="bg-orange-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-orange-600 transition-colors">Reessayer</button>
      </div>
    </div>
  );

  const isPaid = data?.facture?.payment_status === 'succeeded' || data?.link?.statut === 'paye';
  if (isPaid) return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-8 h-8 text-green-500" /></div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Facture deja payee</h1>
        <p className="text-slate-500">Cette facture a deja ete reglee. Merci !</p>
      </div>
    </div>
  );

  if (!data?.facture) return null;

  const { facture, client, entreprise, config, link } = data;
  const lignes = Array.isArray(facture.lignes) ? facture.lignes : [];
  const stripeOk = config?.stripe_enabled || config?.stripe_connected;
  const sepaOk = config?.gocardless_enabled;
  const ibanOk = !!entreprise?.iban;
  const isTest = config?.stripe_livemode === false;
  const totalTTC = link?.montant_ttc || facture.total_ttc || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-6 sm:py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {isTest && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-center">
            <p className="text-sm text-amber-700 font-medium">Mode test — aucun paiement reel</p>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 mb-4">
          <div className="flex items-center gap-4">
            {entreprise?.logo_url ? (
              <img src={entreprise.logo_url} alt={entreprise.nom} className="w-14 h-14 object-contain rounded-xl bg-slate-50 p-1" />
            ) : (
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center"><Building2 className="w-7 h-7 text-orange-500" /></div>
            )}
            <div>
              <h1 className="text-xl font-bold text-slate-800">{entreprise?.nom || 'Artisan'}</h1>
              {entreprise?.adresse && <p className="text-sm text-slate-500">{entreprise.adresse}</p>}
              {entreprise?.telephone && <p className="text-sm text-slate-500">{entreprise.telephone}</p>}
            </div>
          </div>
        </div>

        {/* Invoice details */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-slate-800">Facture {facture.numero}</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-slate-600"><Calendar className="w-4 h-4 text-slate-400" /><span>{fmtDate(facture.date)}</span></div>
            {client?.nom && <div className="flex items-center gap-2 text-sm text-slate-600"><User className="w-4 h-4 text-slate-400" /><span>{client.prenom ? `${client.prenom} ${client.nom}` : client.nom}</span></div>}
          </div>
          {facture.objet && <p className="text-sm text-slate-600 mb-4 bg-slate-50 rounded-lg p-3">{facture.objet}</p>}

          {lignes.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50"><th className="text-left px-4 py-2 font-medium text-slate-600">Description</th><th className="text-right px-4 py-2 font-medium text-slate-600">Montant</th></tr></thead>
                <tbody>
                  {lignes.map((l, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-4 py-2.5 text-slate-700">
                        {l.description || l.designation || l.libelle || `Ligne ${i + 1}`}
                        {l.quantite && l.prix_unitaire && <span className="text-slate-400 text-xs ml-2">({l.quantite} x {fmtCurrency(l.prix_unitaire)})</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-700 whitespace-nowrap">{fmtCurrency(l.total || l.montant || (l.quantite * l.prix_unitaire) || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-slate-200 pt-3 space-y-1">
            {facture.total_ht != null && <div className="flex justify-between text-sm text-slate-600"><span>Total HT</span><span>{fmtCurrency(facture.total_ht)}</span></div>}
            {facture.total_tva != null && facture.total_tva > 0 && <div className="flex justify-between text-sm text-slate-600"><span>TVA</span><span>{fmtCurrency(facture.total_tva)}</span></div>}
            <div className="flex justify-between text-lg font-bold text-slate-800 pt-2 border-t border-slate-100"><span>Total TTC</span><span className="text-orange-600">{fmtCurrency(totalTTC)}</span></div>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4"><CreditCard className="w-5 h-5 text-orange-500" /><h2 className="text-lg font-semibold text-slate-800">Paiement</h2></div>

          {/* Method tabs */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {stripeOk && <button onClick={() => setPaymentMethod('card')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${paymentMethod === 'card' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}><CreditCard className="w-4 h-4" />Carte bancaire</button>}
            {sepaOk && <button onClick={() => setPaymentMethod('sepa')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${paymentMethod === 'sepa' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}><Landmark className="w-4 h-4" />Prelevement SEPA</button>}
            {ibanOk && <button onClick={() => setPaymentMethod('virement')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${paymentMethod === 'virement' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}><Building2 className="w-4 h-4" />Virement bancaire</button>}
          </div>

          {paymentError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" /><p className="text-sm text-red-700 flex-1">{paymentError}</p>
              <button onClick={() => setPaymentError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
            </div>
          )}

          {/* CARD */}
          {paymentMethod === 'card' && stripeOk && (
            <>
              <div className="flex gap-3 mb-4">
                <button onClick={() => setPaymentMode('full')} className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${paymentMode === 'full' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  <Receipt className="w-4 h-4 mx-auto mb-1" />Paiement integral<div className="text-xs mt-0.5 opacity-75">{fmtCurrency(totalTTC)}</div>
                </button>
                <button onClick={() => setPaymentMode('partial')} className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${paymentMode === 'partial' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  <Euro className="w-4 h-4 mx-auto mb-1" />Acompte<div className="text-xs mt-0.5 opacity-75">Montant libre</div>
                </button>
              </div>
              {paymentMode === 'partial' && (
                <div className="mb-4">
                  <label className="text-sm text-slate-600 mb-1 block">Montant de l'acompte (EUR)</label>
                  <div className="relative"><input type="number" min="0.50" max={totalTTC} step="0.01" value={customAmount} onChange={e => setCustomAmount(e.target.value)} placeholder={`Max ${fmtCurrency(totalTTC)}`} className="w-full border border-slate-300 rounded-xl px-4 py-3 pr-10 text-slate-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none" /><Euro className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" /></div>
                  <div className="flex gap-2 mt-2">{[20, 30, 40, 50].map(p => <button key={p} onClick={() => setCustomAmount((Math.round(totalTTC * p) / 100).toFixed(2))} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg transition-colors">{p}% ({fmtCurrency(Math.round(totalTTC * p) / 100)})</button>)}</div>
                </div>
              )}
              <button onClick={() => { setPaymentError(null); handlePayCard(); }} disabled={paying || (paymentMode === 'partial' && !customAmount)} className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-lg shadow-lg shadow-orange-500/20">
                {paying ? <><Loader2 className="w-5 h-5 animate-spin" />Redirection...</> : <><CreditCard className="w-5 h-5" />Payer {paymentMode === 'partial' && customAmount ? fmtCurrency(parseFloat(customAmount)) : fmtCurrency(totalTTC)}</>}
              </button>
              <p className="text-xs text-slate-400 text-center mt-3 flex items-center justify-center gap-1"><Shield className="w-3.5 h-3.5" />Paiement securise par Stripe</p>
            </>
          )}

          {/* SEPA */}
          {paymentMethod === 'sepa' && sepaOk && (
            <div className="space-y-4">
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4"><div className="flex items-start gap-2"><Clock className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" /><div><p className="text-sm font-medium text-teal-800">Prelevement SEPA</p><p className="text-xs text-teal-600 mt-1">Votre compte sera debite sous 3 a 5 jours ouvrables.</p></div></div></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Nom du titulaire</label><input type="text" value={sepaName} onChange={e => setSepaName(e.target.value)} placeholder="Jean Dupont" className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">IBAN</label><input type="text" value={sepaIban} onChange={e => setSepaIban(e.target.value.toUpperCase())} placeholder="FR76 1234 5678 9012 3456 7890 123" className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 font-mono text-sm focus:ring-2 focus:ring-teal-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Email (recu)</label><input type="email" value={sepaEmail} onChange={e => setSepaEmail(e.target.value)} placeholder="jean@example.com" className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" /></div>
              <button onClick={() => { setPaymentError(null); handlePaySepa(); }} disabled={sepaProcessing || !sepaIban || !sepaName} className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-lg">
                {sepaProcessing ? <><Loader2 className="w-5 h-5 animate-spin" />Traitement...</> : <><Landmark className="w-5 h-5" />Prelever {fmtCurrency(totalTTC)}</>}
              </button>
              <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1"><Shield className="w-3.5 h-3.5" />Prelevement securise par GoCardless</p>
            </div>
          )}

          {/* VIREMENT */}
          {paymentMethod === 'virement' && ibanOk && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-sm font-medium text-emerald-800 mb-2">Coordonnees bancaires</p>
                <p className="text-xs text-emerald-600 mb-3">Effectuez un virement en indiquant le numero de facture en reference.</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-white rounded-lg p-3">
                    <div><p className="text-xs text-slate-500">IBAN</p><p className="font-mono text-sm text-slate-800 break-all">{entreprise.iban}</p></div>
                    <button onClick={copyIban} className="p-2 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0">{copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-slate-400" />}</button>
                  </div>
                  {entreprise?.bic && <div className="bg-white rounded-lg p-3"><p className="text-xs text-slate-500">BIC / SWIFT</p><p className="font-mono text-sm text-slate-800">{entreprise.bic}</p></div>}
                  <div className="bg-white rounded-lg p-3"><p className="text-xs text-slate-500">Reference</p><p className="font-mono text-sm text-slate-800 font-bold">{facture.numero}</p></div>
                  <div className="bg-white rounded-lg p-3"><p className="text-xs text-slate-500">Montant</p><p className="text-sm text-slate-800 font-bold">{fmtCurrency(totalTTC)}</p></div>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3"><p className="text-xs text-blue-700">Indiquez la reference <strong>{facture.numero}</strong> dans le motif de votre virement.</p></div>
            </div>
          )}

          {!stripeOk && !sepaOk && !ibanOk && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-amber-700 font-medium">Paiement en ligne non disponible</p>
              <p className="text-sm text-amber-600 mt-1">Contactez l'artisan pour les modalites de paiement.</p>
              {entreprise?.telephone && <a href={`tel:${entreprise.telephone}`} className="text-orange-600 text-sm mt-2 inline-block underline">{entreprise.telephone}</a>}
            </div>
          )}
        </div>

        <div className="text-center mt-6"><p className="text-xs text-slate-400">Propulse par <span className="font-medium text-slate-500">BatiGesti</span></p></div>
      </div>
    </div>
  );
}
