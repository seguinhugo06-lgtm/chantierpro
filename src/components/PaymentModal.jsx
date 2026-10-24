import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CreditCard, QrCode, Copy, Check, ExternalLink, Smartphone, Mail, Share2, AlertTriangle, Banknote, Building2, FileText, Wallet, Link2, MessageCircle, Repeat } from 'lucide-react';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from './ui/Modal';
import { Bouton } from './ui/Bouton';
import Pastille from './ui/Pastille';
import { formatAmount, ACOMPTE_OPTIONS } from '../lib/stripe/payment';
import supabase, { isDemo } from '../supabaseClient';
import { buildPaymentUrl } from '../lib/paymentUtils';
import { jourLocal } from '../lib/dates';
import { telInternational } from '../lib/messageRelance';
import { FONCTIONS } from '../lib/fonctions';
import { MODES_PAIEMENT } from '../lib/modesPaiement';

// Check if Stripe is configured (either Connect or direct keys)
const STRIPE_CONFIGURED = import.meta.env.VITE_STRIPE_PUBLIC_KEY && !import.meta.env.VITE_STRIPE_PUBLIC_KEY.includes('demo');

/**
 * Modes d'un paiement reçu : libellés courts, sans sous-titre (audit UX du 20 oct. 2026 : « Virement ba… »,
 * « Carte banca… » tronqués à 375 px, et « Recommandé BTP », une affirmation invérifiable). Prélèvement : le
 * réglage « Mode de paiement par défaut » le propose.
 */
const ICONES_MODE = { virement: Building2, cheque: FileText, especes: Banknote, cb: CreditCard, prelevement: Repeat, autre: Wallet };
const PAYMENT_MODES = MODES_PAIEMENT.map((m) => ({ value: m.valeur, label: m.libelle, icon: ICONES_MODE[m.valeur] || Wallet }));

/**
 * Crée un lien de paiement vers la page publique /pay/:token.
 * Le token vient de la RPC generate_payment_token (réutilisé s'il existe déjà —
 * chaque facture en reçoit un automatiquement à la création, migration 067).
 * Un montant partiel est porté par ?m=<centimes> ; la page et le serveur le
 * bornent au reste dû. Mock en mode démo.
 */
async function createPaymentLinkEdge(documentId, montantCentimes, totalCentimes) {
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

  const { data: token, error } = await supabase.rpc('generate_payment_token', {
    p_facture_id: documentId,
  });

  if (error || !token) {
    throw new Error(error?.message || 'Erreur lors de la création du lien');
  }

  let url = buildPaymentUrl(token);
  if (montantCentimes && totalCentimes && montantCentimes < totalCentimes) {
    url += `?m=${montantCentimes}`;
  }

  return { token, url, link_id: token, existing: false };
}

/**
 * Modal de paiement — 4 modes :
 * 1. Envoyer un lien de paiement (carte bancaire en ligne)
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
  resteDu,
  // Raison d'une interdiction de paiement en cours (sept jours après une signature sur place, L221-10) : rien ne
  // s'enregistre ni ne se demande tant qu'elle dure (tâche sept-jours)
  paiementBloque = '',
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
  const [offlineDate, setOfflineDate] = useState(jourLocal());
  const [offlineReference, setOfflineReference] = useState('');
  const [offlineAmount, setOfflineAmount] = useState('');
  const [sendReceipt, setSendReceipt] = useState(true);


  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('amount');
      setPaymentLink(null);
      // Paiement en ligne masqué (D-21) : on enregistre un paiement reçu, montant prérempli au reste dû
      setPaymentType(FONCTIONS.paiementEnLigne ? 'link' : 'offline');
      setCustomAmount('');
      setError(null);
      setOfflineMode(entreprise?.modePaiementDefaut || 'virement');
      setOfflineDate(jourLocal());
      setOfflineReference('');
      setOfflineAmount(FONCTIONS.paiementEnLigne ? '' : (Number.isFinite(resteDu) ? Math.round(resteDu * 100) / 100 : (document?.total_ttc || 0)).toFixed(2));
      setSendReceipt(true);
    }
  }, [isOpen, entreprise?.modePaiementDefaut]);

  if (!isOpen || !document) return null;

  const totalTTC = document.total_ttc || 0;
  // Ce qui reste dû (acomptes reçus et avoirs déduits) : c'est ce que l'on encaisse, pas le total de la
  // facture (recette du 9 oct. 2026 : le module proposait le total même après un premier paiement).
  const du = Number.isFinite(resteDu) ? Math.round(resteDu * 100) / 100 : totalTTC;
  const lireMontant = (v) => parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
  const amount = paymentType === 'custom'
    ? (lireMontant(customAmount) || 0)
    : paymentType === 'offline'
      ? (lireMontant(offlineAmount) || du)
      : du;

  const handleGenerateLink = async () => {
    if (amount <= 0) return;
    setLoading(true);
    setError(null);

    try {
      const montantCentimes = Math.round(amount * 100);
      const result = await createPaymentLinkEdge(document.id, montantCentimes, Math.round(totalTTC * 100));

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
    const montant = lireMontant(offlineAmount) || du;
    if (montant <= 0 || paiementBloque) return;

    onPaymentCreated?.({
      amount: montant,
      montant,
      type: 'offline',
      mode_paiement: offlineMode,
      date_paiement: offlineDate,
      reference_paiement: offlineReference.trim() || undefined,
      sendReceipt: !!(sendReceipt && client?.email),
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

    // Indicatif international, chiffres seuls (wa.me refuse « +33… » et « 06… »)
    const phone = telInternational(client?.telephone || client?.tel || '');
    const message = encodeURIComponent(
      `Bonjour,\n\nVoici le lien de paiement pour votre ${document.type === 'facture' ? 'facture' : 'devis'} ${document.numero} (${formatAmount(amount)}).\n\n${paymentLink.paymentUrl}\n\nCordialement,\n${entreprise?.nom || ''}`
    );

    const url = phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  // Une seule façon d'encaisser (paiement en ligne coupé, D-21) : pas de choix à une seule option (audit UX du 20 oct. 2026)
  const choixMultiples = FONCTIONS.paiementEnLigne;
  const carteChoix = (actif) => `w-full min-h-[64px] p-4 rounded-xl border-2 flex items-center justify-between gap-3 text-left transition-colors ${actif ? 'border-accent bg-accent/10' : 'border-bord hover:border-bord-fort'}`;
  const champ = 'w-full h-12 px-4 border rounded-xl text-base bg-surface border-bord-fort text-encre placeholder:text-encre-3';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" closeOnBackdrop={false}>
      <ModalHeader>
        <ModalTitle>{FONCTIONS.paiementEnLigne ? 'Recevoir un paiement' : 'Enregistrer un paiement reçu'}</ModalTitle>
        <ModalDescription>{document.numero}</ModalDescription>
      </ModalHeader>

      <ModalBody>
          {step === 'amount' && (
            <>
              {/* Montant : le reste dû, et le total quand un acompte est déjà reçu */}
              <div className="rounded-xl p-4 mb-5 bg-surface-2">
                <p className="text-sm text-encre-2 mb-1">{du < totalTTC - 0.005 ? 'Reste dû' : 'Montant de la facture'}</p>
                <p className="text-2xl font-bold tabular-nums text-encre">{formatAmount(du)}</p>
                {du < totalTTC - 0.005 && <p className="text-sm text-encre-3 mt-1 tabular-nums">sur {formatAmount(totalTTC)} TTC</p>}
              </div>

              {/* Options de paiement (en ligne : masquées en v1, D-21) */}
              {choixMultiples && (
              <div className="space-y-3 mb-5" role="radiogroup" aria-label="Façon d'encaisser">
                <button type="button" role="radio" aria-checked={paymentType === 'link'} onClick={() => setPaymentType('link')} className={carteChoix(paymentType === 'link')}>
                  <span>
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-encre">Envoyer un lien de paiement</span>
                      <Pastille ton="neutre">Recommandé</Pastille>
                    </span>
                    <span className="block text-sm text-encre-3">Par carte bancaire, sur une page de paiement</span>
                  </span>
                  <Link2 size={20} className={paymentType === 'link' ? 'text-encre' : 'text-encre-3'} aria-hidden="true" />
                </button>

                <button type="button" role="radio" aria-checked={paymentType === 'full'} onClick={() => setPaymentType('full')} className={carteChoix(paymentType === 'full')}>
                  <span>
                    <span className="block font-medium text-encre">Paiement intégral</span>
                    <span className="block text-sm text-encre-3">QR Code pour la totalité</span>
                  </span>
                  <span className="text-lg font-bold tabular-nums text-encre">{formatAmount(du)}</span>
                </button>

                <button type="button" role="radio" aria-checked={paymentType === 'custom'} onClick={() => setPaymentType('custom')} className={carteChoix(paymentType === 'custom')}>
                  <span>
                    <span className="block font-medium text-encre">Paiement partiel</span>
                    <span className="block text-sm text-encre-3">Acompte ou montant personnalisé</span>
                  </span>
                  <span className="text-sm text-encre-2">Personnaliser</span>
                </button>

                <button type="button" role="radio" aria-checked={paymentType === 'offline'} onClick={() => { setPaymentType('offline'); setOfflineAmount(du.toFixed(2)); }} className={carteChoix(paymentType === 'offline')}>
                  <span>
                    <span className="block font-medium text-encre">Paiement reçu (hors ligne)</span>
                    <span className="block text-sm text-encre-3">Virement, chèque, espèces…</span>
                  </span>
                  <Banknote size={20} className={paymentType === 'offline' ? 'text-encre' : 'text-encre-3'} aria-hidden="true" />
                </button>
              </div>
              )}

              {/* Montant personnalisé (mode custom) */}
              {paymentType === 'custom' && (
                <div className="mb-5 space-y-3">
                  <div className="flex gap-2">
                    {ACOMPTE_OPTIONS.map(opt => {
                      const oui = parseFloat(customAmount) === parseFloat((totalTTC * opt.value / 100).toFixed(2));
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          aria-pressed={oui}
                          onClick={() => setCustomAmount((totalTTC * opt.value / 100).toFixed(2))}
                          className={`flex-1 h-11 px-3 rounded-full text-sm font-medium transition-colors ${oui ? 'bg-encre text-surface' : 'bg-surface-2 text-encre-2 hover:bg-bord'}`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      aria-label="Montant en euros"
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                      placeholder="Montant en euros"
                      className={`${champ} pr-12 text-lg font-medium`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-encre-3">EUR</span>
                  </div>
                </div>
              )}

              {/* Paiement reçu : mode, montant, date, référence */}
              {paymentType === 'offline' && (
                <div className="space-y-4">
                  <fieldset>
                    <legend className="block text-sm font-medium mb-2 text-encre-2">Mode de paiement</legend>
                    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Mode de paiement">
                      {PAYMENT_MODES.map(mode => {
                        const Icon = mode.icon;
                        const isSelected = offlineMode === mode.value;
                        return (
                          <button
                            key={mode.value}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => setOfflineMode(mode.value)}
                            className={`h-12 px-3 rounded-xl border-2 flex items-center gap-2 transition-colors text-left ${isSelected ? 'border-accent bg-accent/10' : 'border-bord hover:border-bord-fort'}`}
                          >
                            <Icon size={18} className={isSelected ? 'text-encre' : 'text-encre-3'} aria-hidden="true" />
                            <span className={`text-sm truncate text-encre ${isSelected ? 'font-semibold' : 'font-medium'}`}>{mode.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <label className="block">
                    <span className="block text-sm font-medium mb-1.5 text-encre-2">Montant reçu</span>
                    <span className="relative block">
                      <input
                        type="number"
                        value={offlineAmount}
                        onChange={e => setOfflineAmount(e.target.value)}
                        className={`${champ} pr-12 text-lg font-medium tabular-nums`}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-encre-3">EUR</span>
                    </span>
                  </label>

                  <label className="block">
                    <span className="block text-sm font-medium mb-1.5 text-encre-2">Date de réception</span>
                    <input
                      type="date"
                      value={offlineDate}
                      onChange={e => setOfflineDate(e.target.value)}
                      className={champ}
                    />
                  </label>

                  <label className="block">
                    <span className="block text-sm font-medium mb-1.5 text-encre-2">Référence <span className="font-normal text-encre-3">(facultatif)</span></span>
                    <input
                      type="text"
                      value={offlineReference}
                      onChange={e => setOfflineReference(e.target.value)}
                      placeholder={offlineMode === 'virement' ? 'Réf. du virement' : offlineMode === 'cheque' ? 'N° du chèque' : 'Référence du paiement'}
                      className={champ}
                    />
                  </label>

                  {/* Reçu par e-mail au client */}
                  {client?.email ? (
                    <label className="flex items-start gap-3 p-3 rounded-xl cursor-pointer bg-surface-2">
                      <input
                        type="checkbox"
                        checked={sendReceipt}
                        onChange={e => setSendReceipt(e.target.checked)}
                        className="mt-0.5 w-5 h-5 rounded accent-accent flex-shrink-0"
                      />
                      <span className="text-sm text-encre-2">
                        Envoyer un reçu de paiement par e-mail à <strong className="text-encre">{client.email}</strong>
                      </span>
                    </label>
                  ) : (
                    <p className="text-sm text-encre-3">Pas d'e-mail client : aucun reçu ne sera envoyé.</p>
                  )}
                </div>
              )}

              {paiementBloque && (
                <div role="alert" data-ui="PaiementSeptJours" className="rounded-xl p-3 mt-4 flex items-start gap-2 bg-alerte-fond text-alerte-texte">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm">{paiementBloque}</p>
                </div>
              )}

              {error && (
                <div role="alert" className="rounded-xl p-3 mt-4 flex items-start gap-2 bg-danger-fond text-danger-texte">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </>
          )}

          {step === 'qr' && paymentLink && (
            <>
              {/* QR Code (fond blanc : un QR code se lit noir sur blanc) */}
              <div className="flex flex-col items-center mb-5">
                <div className="p-4 rounded-2xl bg-white mb-4">
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
                  <p className="text-lg font-bold tabular-nums text-encre">{formatAmount(amount)}</p>
                  <p className="text-sm text-encre-3">
                    {paymentType === 'link' ? 'Envoyez ce lien à votre client' : 'Scannez pour payer'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl p-4 mb-5 bg-info-fond text-info-texte flex items-start gap-3">
                <Smartphone size={20} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-medium text-sm">{paymentType === 'link' ? 'Lien multi-méthode' : 'Comment ça marche ?'}</p>
                  <p className="text-sm mt-1">
                    {paymentType === 'link'
                      ? 'Votre client paiera par carte bancaire sur la page du lien.'
                      : 'Le client scanne le QR code avec son téléphone, puis paie de manière sécurisée.'}
                  </p>
                </div>
              </div>

              <div className={`grid ${client?.email ? 'grid-cols-4' : 'grid-cols-3'} gap-2 mb-4`}>
                {[
                  { cle: 'copier', libelle: copied ? 'Copié' : 'Copier', icone: copied ? Check : Copy, onClick: copyLink },
                  { cle: 'whatsapp', libelle: 'WhatsApp', icone: MessageCircle, onClick: sendByWhatsApp },
                  client?.email && { cle: 'email', libelle: 'E-mail', icone: Mail, onClick: sendByEmail },
                  { cle: 'partager', libelle: 'Partager', icone: Share2, onClick: shareLink },
                ].filter(Boolean).map(({ cle, libelle, icone: Icone, onClick }) => (
                  <button key={cle} type="button" onClick={onClick} className="flex flex-col items-center gap-1.5 min-h-[64px] py-3 px-2 rounded-xl transition-colors bg-surface-2 hover:bg-bord">
                    <Icone size={18} className="text-encre-2" aria-hidden="true" />
                    <span className="text-xs text-encre-2">{libelle}</span>
                  </button>
                ))}
              </div>

              <div className="rounded-xl p-3 bg-surface-2 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  aria-label="Lien de paiement"
                  value={paymentLink.paymentUrl}
                  className="flex-1 bg-transparent text-sm truncate text-encre-2"
                />
                <a
                  href={paymentLink.paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Ouvrir le lien de paiement"
                  className="w-11 h-11 flex items-center justify-center rounded-lg transition-colors hover:bg-bord"
                >
                  <ExternalLink size={16} className="text-encre-2" aria-hidden="true" />
                </a>
              </div>
            </>
          )}
      </ModalBody>

      {/* Pied collé : le bouton de validation reste visible au téléphone (avant : à faire défiler) */}
      <ModalFooter>
        {step === 'qr' && paymentLink ? (
          <Bouton variante="secondaire" pleineLargeur onClick={() => { setStep('amount'); setPaymentLink(null); }}>
            Nouveau montant
          </Bouton>
        ) : paymentType === 'offline' ? (
          <Bouton
            variante="principal" taille="grande" pleineLargeur className="whitespace-normal h-auto min-h-[48px] py-2 text-center"
            onClick={handleConfirmOffline}
            disabled={(parseFloat(offlineAmount) || 0) <= 0 || !!paiementBloque}
          >
            Confirmer le paiement — {formatAmount(lireMontant(offlineAmount) || du)}
          </Bouton>
        ) : (
          <Bouton
            variante="principal" taille="grande" pleineLargeur
            icone={loading ? undefined : paymentType === 'link' ? Link2 : QrCode}
            chargement={loading}
            onClick={handleGenerateLink}
            disabled={amount <= 0 || !!paiementBloque}
          >
            {paymentType === 'link'
              ? `Générer le lien — ${formatAmount(amount)}`
              : `Générer le QR Code — ${formatAmount(amount)}`}
          </Bouton>
        )}
      </ModalFooter>
    </Modal>
  );
}
