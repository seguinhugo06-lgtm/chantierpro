import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, CreditCard, QrCode, Copy, Check, Loader, ExternalLink, Smartphone, Mail, Share2 } from 'lucide-react';
import { createPaymentLink, formatAmount, ACOMPTE_OPTIONS } from '../lib/stripe/payment';

/**
 * Modal de paiement avec QR Code Stripe
 * Permet au client de payer directement via son telephone
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
  const [paymentType, setPaymentType] = useState('full'); // 'full' ou 'custom'
  const [customAmount, setCustomAmount] = useState('');
  const [paymentLink, setPaymentLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState('amount'); // 'amount' ou 'qr'

  // Theme classes
  const cardBg = isDark ? "bg-slate-800" : "bg-white";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";
  const inputBg = isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300";

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('amount');
      setPaymentLink(null);
      setPaymentType('full');
      setCustomAmount('');
    }
  }, [isOpen]);

  if (!isOpen || !document) return null;

  const totalTTC = document.total_ttc || 0;
  const amount = paymentType === 'full'
    ? totalTTC
    : parseFloat(customAmount) || 0;

  const handleGenerateLink = async () => {
    if (amount <= 0) return;

    setLoading(true);
    try {
      const link = await createPaymentLink({
        devisId: document.id,
        amount,
        clientEmail: client?.email || '',
        description: `Paiement ${document.type === 'facture' ? 'facture' : 'devis'} ${document.numero}`,
        type: paymentType === 'full' ? 'solde' : 'acompte'
      });

      setPaymentLink(link);
      setStep('qr');

      onPaymentCreated?.({
        ...link,
        documentId: document.id,
        documentType: document.type
      });
    } catch (error) {
      console.error('Erreur creation lien:', error);
    }
    setLoading(false);
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className={`${cardBg} rounded-2xl w-full max-w-md shadow-2xl overflow-hidden`}>
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
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

        {/* Content */}
        <div className="p-5">
          {step === 'amount' && (
            <>
              {/* Montant total */}
              <div className={`rounded-xl p-4 mb-5 ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                <p className={`text-sm ${textMuted} mb-1`}>Montant de la facture</p>
                <p className="text-2xl font-bold" style={{ color: couleur }}>{formatAmount(totalTTC)}</p>
              </div>

              {/* Options de paiement */}
              <div className="space-y-3 mb-5">
                <button
                  onClick={() => setPaymentType('full')}
                  className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                    paymentType === 'full'
                      ? (isDark ? 'border-emerald-500 bg-emerald-900/20' : 'border-emerald-500 bg-emerald-50')
                      : (isDark ? 'border-slate-600' : 'border-slate-200')
                  }`}
                >
                  <div className="text-left">
                    <p className={`font-medium ${textPrimary}`}>Paiement integral</p>
                    <p className={`text-sm ${textMuted}`}>Le client paie la totalite</p>
                  </div>
                  <span className="text-lg font-bold" style={{ color: paymentType === 'full' ? couleur : '#94a3b8' }}>
                    {formatAmount(totalTTC)}
                  </span>
                </button>

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
                    <p className={`text-sm ${textMuted}`}>Acompte ou montant personnalise</p>
                  </div>
                  <span className="text-sm" style={{ color: paymentType === 'custom' ? couleur : '#94a3b8' }}>
                    Personnaliser
                  </span>
                </button>
              </div>

              {/* Montant personnalise */}
              {paymentType === 'custom' && (
                <div className="mb-5 space-y-3">
                  {/* Boutons raccourcis */}
                  <div className="flex gap-2">
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

              {/* Bouton generer */}
              <button
                onClick={handleGenerateLink}
                disabled={loading || amount <= 0}
                className="w-full py-4 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:shadow-lg"
                style={{ background: couleur }}
              >
                {loading ? (
                  <Loader size={20} className="animate-spin" />
                ) : (
                  <QrCode size={20} />
                )}
                Generer le QR Code
              </button>
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
                  <p className={`text-sm ${textMuted}`}>Scannez pour payer</p>
                </div>
              </div>

              {/* Instructions */}
              <div className={`rounded-xl p-4 mb-5 ${isDark ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                <div className="flex items-start gap-3">
                  <Smartphone size={20} className="text-blue-500 mt-0.5" />
                  <div>
                    <p className={`font-medium text-sm ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>Comment ca marche ?</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                      Le client scanne le QR code avec son telephone, puis paie par carte bancaire de maniere securisee.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <button
                  onClick={copyLink}
                  className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl transition-colors ${
                    isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} className={textSecondary} />}
                  <span className={`text-xs ${textMuted}`}>{copied ? 'Copie !' : 'Copier'}</span>
                </button>

                <button
                  onClick={shareLink}
                  className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl transition-colors ${
                    isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  <Share2 size={20} className={textSecondary} />
                  <span className={`text-xs ${textMuted}`}>Partager</span>
                </button>

                {client?.email && (
                  <button
                    onClick={sendByEmail}
                    className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl transition-colors ${
                      isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    <Mail size={20} className={textSecondary} />
                    <span className={`text-xs ${textMuted}`}>Email</span>
                  </button>
                )}
              </div>

              {/* Lien */}
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
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                >
                  <ExternalLink size={16} className={textSecondary} />
                </a>
              </div>

              {/* Nouveau paiement */}
              <button
                onClick={() => setStep('amount')}
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
