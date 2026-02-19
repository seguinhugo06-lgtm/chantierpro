/**
 * FacturePaymentPage — Public payment page for invoices
 *
 * Accessible via /facture/payer/:token (no authentication required)
 * Displays invoice details and allows payment via Stripe Checkout.
 *
 * States:
 *   - loading: fetching invoice data
 *   - error: invalid/expired token
 *   - already_paid: invoice already paid
 *   - ready: ready to pay
 *   - processing: redirecting to Stripe
 *   - success: payment completed (redirected back from Stripe)
 *   - canceled: payment canceled by user
 */

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  CreditCard,
  CheckCircle,
  XCircle,
  FileText,
  Building2,
  User,
  Loader2,
  AlertTriangle,
  Euro,
  Calendar,
  Receipt,
  ArrowLeft,
} from 'lucide-react'

// Initialize Supabase client for public access (anon key)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// ─── Helpers ─────────────────────────────────────────────────────────

function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount || 0)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ─── Component ───────────────────────────────────────────────────────

export default function FacturePaymentPage({ paymentToken }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [paymentError, setPaymentError] = useState(null)
  const [paying, setPaying] = useState(false)
  const [paymentMode, setPaymentMode] = useState('full') // 'full' or 'partial'
  const [customAmount, setCustomAmount] = useState('')

  // Check URL params for success/canceled
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), [])
  const isSuccess = urlParams.get('success') === 'true'
  const isCanceled = urlParams.get('canceled') === 'true'

  // ─── Load facture data ───────────────────────────────────────────

  useEffect(() => {
    if (!paymentToken) {
      setError('Token de paiement manquant')
      setLoading(false)
      return
    }

    if (!supabase) {
      setError('Configuration Supabase manquante')
      setLoading(false)
      return
    }

    loadFacture()
  }, [paymentToken])

  async function loadFacture() {
    try {
      setLoading(true)
      const { data: result, error: rpcError } = await supabase
        .rpc('get_facture_for_payment', { p_token: paymentToken })

      if (rpcError) throw rpcError

      if (result?.error) {
        setError(result.error)
        return
      }

      setData(result)
    } catch (err) {
      console.error('Failed to load facture:', err)
      setError('Impossible de charger la facture. Le lien est peut-etre invalide ou expire.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Handle payment ──────────────────────────────────────────────

  async function handlePay() {
    if (!data?.facture) return

    setPaying(true)
    try {
      const totalCents = Math.round((data.facture.total_ttc || 0) * 100)
      const amountCents = paymentMode === 'partial' && customAmount
        ? Math.round(parseFloat(customAmount) * 100)
        : totalCents

      if (amountCents < 50) {
        setPaymentError('Le montant minimum est de 0,50 EUR')
        setPaying(false)
        return
      }

      if (amountCents > totalCents) {
        setPaymentError('Le montant ne peut pas depasser le total de la facture')
        setPaying(false)
        return
      }

      // Call Edge Function
      const functionUrl = `${supabaseUrl}/functions/v1/create-invoice-payment`
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          payment_token: paymentToken,
          amount_cents: paymentMode === 'partial' ? amountCents : undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Erreur lors de la creation du paiement')
      }

      // Redirect to Stripe Checkout
      if (result.url) {
        window.location.href = result.url
      } else {
        throw new Error('URL de paiement non recue')
      }
    } catch (err) {
      console.error('Payment error:', err)
      setPaymentError(err.message || 'Erreur lors du paiement')
      setPaying(false)
    }
  }

  // ─── Render states ───────────────────────────────────────────────

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-3" />
          <p className="text-slate-500">Chargement de la facture...</p>
        </div>
      </div>
    )
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Lien invalide</h1>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    )
  }

  // Success
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Paiement recu !</h1>
          <p className="text-slate-500 mb-4">
            Merci pour votre paiement. Un recu vous sera envoye par email.
          </p>
          {data?.facture && (
            <div className="bg-green-50 rounded-xl p-4 text-left">
              <p className="text-sm text-green-700">
                <strong>Facture :</strong> {data.facture.numero}
              </p>
              <p className="text-sm text-green-700">
                <strong>Montant :</strong> {formatCurrency(data.facture.total_ttc)}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Canceled
  if (isCanceled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Paiement annule</h1>
          <p className="text-slate-500 mb-6">
            Vous avez annule le paiement. Vous pouvez reessayer a tout moment.
          </p>
          <button
            onClick={() => window.location.href = window.location.pathname}
            className="bg-orange-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-orange-600 transition-colors"
          >
            Reessayer le paiement
          </button>
        </div>
      </div>
    )
  }

  // Already paid
  if (data?.facture?.payment_status === 'succeeded') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Facture deja payee</h1>
          <p className="text-slate-500">
            Cette facture a deja ete reglee. Merci !
          </p>
        </div>
      </div>
    )
  }

  if (!data?.facture) return null

  const { facture, client, entreprise, stripe_enabled } = data
  const lignes = Array.isArray(facture.lignes) ? facture.lignes : []

  // ─── Main payment page ──────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header with entreprise info */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-4">
          <div className="flex items-center gap-4">
            {entreprise?.logo_url ? (
              <img
                src={entreprise.logo_url}
                alt={entreprise.nom}
                className="w-14 h-14 object-contain rounded-xl bg-slate-50 p-1"
              />
            ) : (
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-7 h-7 text-orange-500" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-slate-800">{entreprise?.nom || 'Artisan'}</h1>
              {entreprise?.adresse && (
                <p className="text-sm text-slate-500">{entreprise.adresse}</p>
              )}
              {entreprise?.telephone && (
                <p className="text-sm text-slate-500">{entreprise.telephone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Invoice details card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-slate-800">
              Facture {facture.numero}
            </h2>
          </div>

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{formatDate(facture.date)}</span>
            </div>
            {client?.nom && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <User className="w-4 h-4 text-slate-400" />
                <span>{client.prenom ? `${client.prenom} ${client.nom}` : client.nom}</span>
              </div>
            )}
          </div>

          {/* Object */}
          {facture.objet && (
            <p className="text-sm text-slate-600 mb-4 bg-slate-50 rounded-lg p-3">
              {facture.objet}
            </p>
          )}

          {/* Line items */}
          {lignes.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-4 py-2 font-medium text-slate-600">Description</th>
                    <th className="text-right px-4 py-2 font-medium text-slate-600">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((ligne, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-4 py-2.5 text-slate-700">
                        {ligne.description || ligne.designation || ligne.libelle || `Ligne ${i + 1}`}
                        {ligne.quantite && ligne.prix_unitaire && (
                          <span className="text-slate-400 text-xs ml-2">
                            ({ligne.quantite} x {formatCurrency(ligne.prix_unitaire)})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-700 whitespace-nowrap">
                        {formatCurrency(ligne.total || ligne.montant || (ligne.quantite * ligne.prix_unitaire) || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div className="border-t border-slate-200 pt-3 space-y-1">
            {facture.total_ht != null && (
              <div className="flex justify-between text-sm text-slate-600">
                <span>Total HT</span>
                <span>{formatCurrency(facture.total_ht)}</span>
              </div>
            )}
            {facture.tva != null && facture.tva > 0 && (
              <div className="flex justify-between text-sm text-slate-600">
                <span>TVA</span>
                <span>{formatCurrency(facture.tva)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-slate-800 pt-2 border-t border-slate-100">
              <span>Total TTC</span>
              <span className="text-orange-600">{formatCurrency(facture.total_ttc)}</span>
            </div>
          </div>
        </div>

        {/* Payment section */}
        {stripe_enabled ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-semibold text-slate-800">Paiement</h2>
            </div>

            {/* Payment mode selection */}
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setPaymentMode('full')}
                className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                  paymentMode === 'full'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <Receipt className="w-4 h-4 mx-auto mb-1" />
                Paiement integral
                <div className="text-xs mt-0.5 opacity-75">{formatCurrency(facture.total_ttc)}</div>
              </button>
              <button
                onClick={() => setPaymentMode('partial')}
                className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                  paymentMode === 'partial'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <Euro className="w-4 h-4 mx-auto mb-1" />
                Acompte
                <div className="text-xs mt-0.5 opacity-75">Montant libre</div>
              </button>
            </div>

            {/* Partial amount input */}
            {paymentMode === 'partial' && (
              <div className="mb-4">
                <label className="text-sm text-slate-600 mb-1 block">Montant de l'acompte (EUR)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0.50"
                    max={facture.total_ttc}
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder={`Max ${formatCurrency(facture.total_ttc)}`}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 pr-10 text-slate-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  />
                  <Euro className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
                </div>
                {/* Quick amounts */}
                <div className="flex gap-2 mt-2">
                  {[20, 30, 40, 50].map(pct => {
                    const amount = Math.round(facture.total_ttc * pct) / 100
                    return (
                      <button
                        key={pct}
                        onClick={() => setCustomAmount(amount.toFixed(2))}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {pct}% ({formatCurrency(amount)})
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Payment error */}
            {paymentError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-700">{paymentError}</p>
                </div>
                <button onClick={() => setPaymentError(null)} className="text-red-400 hover:text-red-600">
                  <span className="text-lg leading-none">&times;</span>
                </button>
              </div>
            )}

            {/* Pay button */}
            <button
              onClick={() => { setPaymentError(null); handlePay(); }}
              disabled={paying || (paymentMode === 'partial' && !customAmount)}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-lg shadow-lg shadow-orange-500/20"
            >
              {paying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Redirection vers le paiement...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Payer {paymentMode === 'partial' && customAmount
                    ? formatCurrency(parseFloat(customAmount))
                    : formatCurrency(facture.total_ttc)
                  }
                </>
              )}
            </button>

            {/* Security note */}
            <p className="text-xs text-slate-400 text-center mt-3 flex items-center justify-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Paiement securise par Stripe
            </p>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-amber-700 font-medium">Paiement en ligne non disponible</p>
            <p className="text-sm text-amber-600 mt-1">
              Contactez l'artisan pour les modalites de paiement.
            </p>
            {entreprise?.tel && (
              <a href={`tel:${entreprise.tel}`} className="text-orange-600 text-sm mt-2 inline-block underline">
                {entreprise.tel}
              </a>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-slate-400">
            Propulse par <span className="font-medium text-slate-500">ChantierPro</span>
          </p>
        </div>
      </div>
    </div>
  )
}
