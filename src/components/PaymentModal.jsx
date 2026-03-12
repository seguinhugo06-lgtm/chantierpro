import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, CreditCard, QrCode, Copy, Check, Loader, ExternalLink, Smartphone, Mail, Share2, AlertTriangle, Info, Banknote, Building2, FileText, Wallet, Link2, MessageCircle } from 'lucide-react';
import { formatAmount, ACOMPTE_OPTIONS } from '../lib/stripe/payment';
import supabase, { isDemo } from '../supabaseClient';
import { buildPaymentUrl } from '../lib/paymentUtils';

// Check if Stripe is configured (either Connect or direct keys)
const STRIPE_CONFIGURED = import.meta.env.VITE_STRIPE_PUBLIC_KEY && !import.meta.env.VITE_STRIPE_PUBLIC_KEY.includes('demo');

/** Offline payment modes */
const PAYMENT_MODES = [
  { value: 'virement', label: 'Virement bancaire', icon: Building2, description: 'Recommandé BTP' },
  { value: 'cheque', label: 'Chèque', icon: FileText, description: 'Précisez le numéro' },
  { value: 'especes', label: 'Espèces', icon: Banknote, description: 'Paiement en main propre' },
  { value: 'cb', label: 'Carte bancaire', icon: CreditCard, description: 'Terminal ou TPE' },
  { value: 'autre', label: 'Autre', icon: Wallet, description: 'Prélèvement, etc.' },
];

/**
 * Create payment link via Supabase Edge Function
 * Falls back to mock in demo mode
 */
async function createPaymentLinkEdge(documentId, montantCentimes) {
  if (isDemo || !supabase) {
    // Mock for demo mode
    const token = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      token,
      url: buildPaymentUrl(token),
      link_id: `mock_${token}`,
      existing: false,
    };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Non authentifié');

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-link`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        document_id: documentId,
        montant_centimes: montantCentimes,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erreur lors de la création du lien');
  }

  return await res.json();
}

/**
 * Modal de paiement — 4 modes :
 * 1. Envoyer un lien de paiement (CB/SEPA/Virement en ligne)
 * 2. Paiement intégral (lien de paiement)
 * 3. Paiement partiel (lien de paiement)
 * 4. Paiement reçu hors ligne (virement, chèque, espèces…)
 */
export default function PaymentModal({
  isOpen,
  onClose,
  document,
  client,
  entreprise,
  onPaymentCreated,
  isDark,
  couleur
}) {
  const [paymentType, setPaymentType] = useState('link'); // 'link', 'full', 'custom', 'offline'
  const [customAmount, setCustomAmount] = useState('');
  const [paymentLink, setPaymentLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState('amount'); // 'amount', 'qr', 'offline_form'

  // Offline payment state
  const [offlineMode, setOfflineMode] = useState(entreprise?.modePaiementDefaut || 'virement');
  const [offlineDate, setOfflineDate] = useState(new Date().toISOString().split('T')[0]);
  const [offlineReference, setOfflineReference] = useState('');
  const [offlineAmount, setOfflineAmount] = useState('');

  // Theme classes
  const cardBg = isDark ? "bg-slate-800" : "bg-white";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-400" : "text-slate-600";
  const inputBg = isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300";

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('amount');
      setPaymentLink(null);
      setPaymentType('link');
      setCustomAmount('');
      setError(null);
      setOfflineMode(entreprise?.modePaiementDefaut || 'virement');
      setOfflineDate(new Date().toISOString().split('T')[0]);
      setOfflineReference('');
      setOfflineAmount('');
    }
  }, [isOpen, entreprise?.modePaiementDefaut]);

  if (!isOpen || !document) return null;

  const totalTTC = document.total_ttc || 0;
  const amount = paymentType === 'custom'
    ? (parseFloat(customAmount) || 0)
    : paymentType === 'offline'
      ? (parseFloat(offlineAmount) || totalTTC)
      : totalTTC;

  const handleGenerateLink = async () => {
    if (amount <= 0) return;
    setLoading(true);
    setError(null);

    try {
      const montantCentimes = Math.round(amount * 100);
      const result = await createPaymentLinkEdge(document.id, montantCentimes);

      setPaymentLink({
        paymentUrl: result.url,
        token: result.token,
        linkId: result.link_id,
        existing: result.existing,
      });
      setStep('qr');

      onPaymentCreated?.({
        paymentUrl: result.url,
        token: result.token,
        linkId: result.link_id,
        amount,
        documentId: document.id,
        documentType: document.type,
        type: paymentType === 'custom' ? 'acompte' : 'solde',
      });
    } catch (err) {
      console.error('Erreur creation lien:', err);
      setError(err.message || 'Erreur lors de la création du lien de paiement');
    }
    setLoading(false);
  };

  /** Confirm offline payment — marks facture as paid */
  const handleConfirmOffline = () => {
    const montant = parseFloat(offlineAmount) || totalTTC;
    if (montant <= 0) return;

    onPaymentCreated?.({
      amount: montant,
      montant,
      type: 'offline',
      mode_paiement: offlineMode,
      date_paiement: offlineDate,
      reference_paiement: offlineReference.trim() || undefined,
      documentId: document.id,
      documentType: document.type,
      status: 'completed',
    });

    onClose();
  };

  const copyLink = () => {
    if (!paymentLink?.paymentUrl) return;
    navigator.clipboard.writeText(paymentLink.paymentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (!paymentLink?.paymentUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Paiement ${document.numero}`,
          text: `Paiement de ${formatAmount(amount)} pour ${entreprise?.nom || 'votre artisan'}`,
          url: paymentLink.paymentUrl
        });
      } catch (err) {
        copyLink();
      }
    } else {
      copyLink();
    }
  };

  const sendByEmail = () => {
    if (!paymentLink?.paymentUrl || !client?.email) return;

    const subject = encodeURIComponent(`Lien de paiement - ${document.numero}`);
    const body = encodeURIComponent(
      `Bonjour,\n\nVoici le lien pour régler votre ${document.type === 'facture' ? 'facture' : 'devis'} ${document.numero}.\n\nMontant : ${formatAmount(amount)}\n\nLien de paiement : ${paymentLink.paymentUrl}\n\nCordialement,\n${entreprise?.nom || ''}`
    );

    window.open(`mailto:${client.email}?subject=${subject}&body=${body}`);
  };

  const sendByWhatsApp = () => {
    if (!paymentLink?.paymentUrl) return;

    const phone = (client?.telephone || client?.tel || '').replace(/\s/g, '').replace(/^0/, '+33');
    const message = encodeURIComponent(
      `Bonjour,\n\nVoici le lien de paiement pour votre ${document.type === 'facture' ? 'facture' : 'devis'} ${document.numero} (${formatAmount(amount)}).\n\n${paymentLink.paymentUrl}\n\nCordialement,\n${entreprise?.nom || ''}`
    );

    const url = phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  const selectedModeInfo = PAYMENT_MODES.find(m => m.value === offlineMode);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className={`${cardBg} rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${couleur}20` }}>
              <CreditCard size={20} style={{ color: couleur }} />
            </div>
            <div>
              <h2 className={`font-bold text-lg ${textPrimary}`}>Recevoir un paiement</h2>
              <p className={`text-sm ${textMuted}`}>{document.numero}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} transition-colors`}
          >
            <X size={20} className={textSecondary} />
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="p-5 overflow-y-auto">
          {step === 'amount' && (
            <>
              {/* Montant total */}
              <div className={`rounded-xl p-4 mb-5 ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                <p className={`text-sm ${textMuted} mb-1`}>Montant de la facture</p>
                <p className="text-2xl font-bold" style={{ color: couleur }}>{formatAmount(totalTTC)}</p>
              </div>

              {/* Options de paiement */}
              <div className="space-y-3 mb-5">
                {/* Option 1: Envoyer un lien de paiement (NEW) */}
                <button
                  onClick={() => setPaymentType('link')}
                  className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                    paymentType === 'link'
                      ? (isDark ? 'border-orange-500 bg-orange-900/20' : 'border-orange-500 bg-orange-50')
                      : (isDark ? 'border-slate-600' : 'border-slate-200')
                  }`}
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${textPrimary}`}>Envoyer un lien de paiement</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${isDark ? 'bg-orange-900/50 text-orange-400' : 'bg-orange-100 text-orange-700'}`}>
                        Recommandé
                      </span>
                    </div>
                    <p className={`text-sm ${textMuted}`}>CB, SEPA ou virement — le client choisit</p>
                  </div>
                  <Link2 size={20} style={{ color: paymentType === 'link' ? couleur : '#94a3b8' }} />
                </button>

                {/* Option 2: Paiement intégral */}
                <button
                  onClick={() => setPaymentType('full')}
                  className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                    paymentType === 'full'
                      ? (isDark ? 'border-emerald-500 bg-emerald-900/20' : 'border-emerald-500 bg-emerald-50')
                      : (isDark ? 'border-slate-600' : 'border-slate-200')
                  }`}
                >
                  <div className="text-left">
                    <p className={`font-medium ${textPrimary}`}>Paiement intégral</p>
                    <p className={`text-sm ${textMuted}`}>QR Code pour la totalité</p>
                  </div>
                  <span className="text-lg font-bold" style={{ color: paymentType === 'full' ? couleur : '#94a3b8' }}>
                    {formatAmount(totalTTC)}
                  </span>
                </button>

                {/* Option 3: Paiement partiel */}
                <button
                  onClick={() => setPaymentType('custom')}
                  className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                    paymentType === 'custom'
                      ? (isDark ? 'border-purple-500 bg-purple-900/20' : 'border-purple-500 bg-purple-50')
                      : (isDark ? 'border-slate-600' : 'border-slate-200')
                  }`}
                >
                  <div className="text-left">
                    <p className={`font-medium ${textPrimary}`}>Paiement partiel</p>
                    <p className={`text-sm ${textMuted}`}>Acompte ou montant personnalisé</p>
                  </div>
                  <span className="text-sm" style={{ color: paymentType === 'custom' ? couleur : '#94a3b8' }}>
                    Personnaliser
                  </span>
                </button>

                {/* Option 4: Paiement reçu hors ligne */}
                <button
                  onClick={() => { setPaymentType('offline'); setOfflineAmount(totalTTC.toFixed(2)); }}
                  className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                    paymentType === 'offline'
                      ? (isDark ? 'border-blue-500 bg-blue-900/20' : 'border-blue-500 bg-blue-50')
                      : (isDark ? 'border-slate-600' : 'border-slate-200')
                  }`}
                >
                  <div className="text-left">
                    <p className={`font-medium ${textPrimary}`}>Paiement reçu (hors ligne)</p>
                    <p className={`text-sm ${textMuted}`}>Virement, chèque, espèces...</p>
                  </div>
                  <Banknote size={20} style={{ color: paymentType === 'offline' ? '#3b82f6' : '#94a3b8' }} />
                </button>
              </div>

              {/* Montant personnalisé (mode custom) */}
              {paymentType === 'custom' && (
                <div className="mb-5 space-y-3">
                  {/* Boutons raccourcis */}
                  <div className="flex gap-3">
                    {ACOMPTE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setCustomAmount((totalTTC * opt.value / 100).toFixed(2))}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          parseFloat(customAmount) === parseFloat((totalTTC * opt.value / 100).toFixed(2))
                            ? 'text-white'
                            : (isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600')
                        }`}
                        style={parseFloat(customAmount) === parseFloat((totalTTC * opt.value / 100).toFixed(2)) ? { background: couleur } : {}}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Input montant */}
                  <div className="relative">
                    <input
                      type="number"
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                      placeholder="Montant en euros"
                      className={`w-full px-4 py-3 pr-12 border rounded-xl text-lg font-medium ${inputBg}`}
                    />
                    <span className={`absolute right-4 top-1/2 -translate-y-1/2 ${textMuted}`}>EUR</span>
                  </div>
                </div>
              )}

              {/* Offline payment form */}
              {paymentType === 'offline' && (
                <div className="mb-5 space-y-4">
                  {/* Mode de paiement */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Mode de paiement</label>
                    <div className="grid grid-cols-2 gap-2">
                      {PAYMENT_MODES.map(mode => {
                        const Icon = mode.icon;
                        const isSelected = offlineMode === mode.value;
                        return (
                          <button
                            key={mode.value}
                            onClick={() => setOfflineMode(mode.value)}
                            className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all text-left ${
                              isSelected
                                ? (isDark ? 'border-blue-500 bg-blue-900/20' : 'border-blue-500 bg-blue-50')
                                : (isDark ? 'border-slate-600 hover:border-slate-500' : 'border-slate-200 hover:border-slate-300')
                            }`}
                          >
                            <Icon size={16} style={{ color: isSelected ? '#3b82f6' : '#94a3b8' }} />
                            <div className="min-w-0">
                              <p className={`text-sm font-medium truncate ${textPrimary}`}>{mode.label}</p>
                              {isSelected && <p className={`text-xs ${textMuted} truncate`}>{mode.description}</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Montant */}
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Montant reçu</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={offlineAmount}
                        onChange={e => setOfflineAmount(e.target.value)}
                        className={`w-full px-4 py-3 pr-12 border rounded-xl text-lg font-medium ${inputBg}`}
                      />
                      <span className={`absolute right-4 top-1/2 -translate-y-1/2 ${textMuted}`}>EUR</span>
                    </div>
                  </div>

                  {/* Date de réception */}
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Date de réception</label>
                    <input
                      type="date"
                      value={offlineDate}
                      onChange={e => setOfflineDate(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl ${inputBg}`}
                    />
                  </div>

                  {/* Référence (optionnel) */}
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>
                      Référence <span className={textMuted}>(optionnel)</span>
                    </label>
                    <input
                      type="text"
                      value={offlineReference}
                      onChange={e => setOfflineReference(e.target.value)}
                      placeholder={offlineMode === 'virement' ? 'Réf. virement bancaire' : offlineMode === 'cheque' ? 'N° du chèque' : 'Référence du paiement'}
                      className={`w-full px-4 py-3 border rounded-xl ${inputBg}`}
                    />
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className={`rounded-xl p-3 mb-4 flex items-start gap-2 ${isDark ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5 text-red-500" />
                  <p className={`text-xs ${isDark ? 'text-red-300' : 'text-red-700'}`}>{error}</p>
                </div>
              )}

              {/* Action buttons */}
              {paymentType === 'offline' ? (
                <button
                  onClick={handleConfirmOffline}
                  disabled={(parseFloat(offlineAmount) || 0) <= 0}
                  className="w-full py-4 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:shadow-lg bg-emerald-500 hover:bg-emerald-600"
                >
                  <Check size={20} />
                  Confirmer le paiement — {formatAmount(parseFloat(offlineAmount) || totalTTC)}
                </button>
              ) : (
                <button
                  onClick={handleGenerateLink}
                  disabled={loading || amount <= 0}
                  className="w-full py-4 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:shadow-lg"
                  style={{ background: couleur }}
                >
                  {loading ? (
                    <Loader size={20} className="animate-spin" />
                  ) : paymentType === 'link' ? (
                    <Link2 size={20} />
                  ) : (
                    <QrCode size={20} />
                  )}
                  {paymentType === 'link'
                    ? `Générer le lien — ${formatAmount(amount)}`
                    : `Générer le QR Code — ${formatAmount(amount)}`}
                </button>
              )}
            </>
          )}

          {step === 'qr' && paymentLink && (
            <>
              {/* QR Code */}
              <div className="flex flex-col items-center mb-5">
                <div className={`p-4 rounded-2xl ${isDark ? 'bg-white' : 'bg-slate-50'} mb-4`}>
                  <QRCodeSVG
                    value={paymentLink.paymentUrl}
                    size={200}
                    level="H"
                    includeMargin={true}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>

                <div className="text-center">
                  <p className={`text-lg font-bold ${textPrimary}`}>{formatAmount(amount)}</p>
                  <p className={`text-sm ${textMuted}`}>
                    {paymentType === 'link' ? 'Envoyez ce lien à votre client' : 'Scannez pour payer'}
                  </p>
                </div>
              </div>

              {/* Info banner */}
              <div className={`rounded-xl p-4 mb-5 ${isDark ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                <div className="flex items-start gap-3">
                  <Smartphone size={20} className="text-blue-500 mt-0.5" />
                  <div>
                    <p className={`font-medium text-sm ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
                      {paymentType === 'link' ? 'Lien multi-méthode' : 'Comment ça marche ?'}
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                      {paymentType === 'link'
                        ? 'Votre client pourra choisir de payer par carte bancaire, prélèvement SEPA ou virement bancaire.'
                        : 'Le client scanne le QR code avec son téléphone, puis paie de manière sécurisée.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sharing actions */}
              <div className={`grid ${client?.email ? 'grid-cols-4' : 'grid-cols-3'} gap-2 mb-4`}>
                <button
                  onClick={copyLink}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-colors ${
                    isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} className={textSecondary} />}
                  <span className={`text-xs ${textMuted}`}>{copied ? 'Copié !' : 'Copier'}</span>
                </button>

                <button
                  onClick={sendByWhatsApp}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-colors ${
                    isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  <MessageCircle size={18} className="text-green-500" />
                  <span className={`text-xs ${textMuted}`}>WhatsApp</span>
                </button>

                {client?.email && (
                  <button
                    onClick={sendByEmail}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-colors ${
                      isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    <Mail size={18} className={textSecondary} />
                    <span className={`text-xs ${textMuted}`}>Email</span>
                  </button>
                )}

                <button
                  onClick={shareLink}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-colors ${
                    isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  <Share2 size={18} className={textSecondary} />
                  <span className={`text-xs ${textMuted}`}>Partager</span>
                </button>
              </div>

              {/* Lien URL */}
              <div className={`rounded-xl p-3 ${isDark ? 'bg-slate-700' : 'bg-slate-100'} flex items-center gap-2`}>
                <input
                  type="text"
                  readOnly
                  value={paymentLink.paymentUrl}
                  className={`flex-1 bg-transparent text-xs truncate ${textMuted}`}
                />
                <a
                  href={paymentLink.paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`}
                >
                  <ExternalLink size={16} className={textSecondary} />
                </a>
              </div>

              {/* Nouveau montant */}
              <button
                onClick={() => { setStep('amount'); setPaymentLink(null); }}
                className={`w-full mt-4 py-3 rounded-xl font-medium ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
              >
                Nouveau montant
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
