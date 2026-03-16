/**
 * TransactionFlow Component
 * Complete marketplace transaction workflow
 *
 * @module TransactionFlow
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Package,
  Check,
  Clock,
  MapPin,
  Calendar,
  Phone,
  MessageCircle,
  Star,
  AlertCircle,
  X,
  ChevronRight,
  Truck,
  User,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Send,
  ThumbsUp,
  Flag,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  useMarketplaceTransaction,
  useUserTransactions,
  createProposal,
  submitEvaluation,
  TRANSACTION_STEPS,
  STATUS_LABELS,
  STATUS_COLORS,
  getCurrentStep,
  formatCurrency,
  formatDate,
  generateTransactionNumber,
} from '../../hooks/useMarketplaceTransaction';
import Modal, { ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Avatar } from './ConversationList';

// ============ BUYER PROPOSAL MODAL ============

/**
 * BuyerProposalModal - Modal for creating a purchase proposal
 */
export function BuyerProposalModal({
  isOpen,
  onClose,
  listing,
  userId,
  onSuccess,
  isDark = false,
}) {
  const [quantite, setQuantite] = useState(1);
  const [prixPropose, setPrixPropose] = useState('');
  const [modeRetrait, setModeRetrait] = useState('pickup');
  const [dateRetrait, setDateRetrait] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const fraisLivraison = 15; // Fixed delivery fee
  const prixUnitaire = prixPropose ? parseFloat(prixPropose) : listing?.prix_unitaire || 0;
  const sousTotal = quantite * prixUnitaire;
  const total = sousTotal + (modeRetrait === 'delivery' ? fraisLivraison : 0);

  const handleSubmit = async () => {
    if (!quantite || quantite < 1) {
      setError('Quantité invalide');
      return;
    }
    if (!dateRetrait) {
      setError('Veuillez choisir une date');
      return;
    }

    setSending(true);
    setError(null);

    const result = await createProposal({
      listing_id: listing.id,
      seller_id: listing.user_id || listing.seller_id,
      quantite,
      prix_original: listing.prix_unitaire,
      prix_propose: prixPropose ? parseFloat(prixPropose) : null,
      mode_retrait: modeRetrait,
      frais_livraison: modeRetrait === 'delivery' ? fraisLivraison : 0,
      date_retrait: dateRetrait,
      notes,
    }, userId);

    setSending(false);

    if (result.success) {
      onSuccess?.(result.transaction);
      onClose();
      // Reset form
      setQuantite(1);
      setPrixPropose('');
      setModeRetrait('pickup');
      setDateRetrait('');
      setNotes('');
    } else {
      setError(result.error || 'Erreur lors de l\'envoi');
    }
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);

  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-gray-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';

  if (!listing) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isDark={isDark}>
      <ModalHeader>
        <ModalTitle>Proposer un achat</ModalTitle>
      </ModalHeader>
      <ModalBody>
        {/* Listing summary */}
        <div className={cn('flex gap-3 p-3 rounded-lg mb-4', isDark ? 'bg-slate-700' : 'bg-gray-50')}>
          {listing.photos?.[0] && (
            <img
              src={listing.photos[0]}
              alt={listing.titre}
              className="w-16 h-16 rounded-lg object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className={cn('font-medium truncate', textPrimary)}>{listing.titre}</p>
            <p className={cn('text-sm', textSecondary)}>
              {formatCurrency(listing.prix_unitaire)}/{listing.unite}
            </p>
            <p className={cn('text-xs', textMuted)}>
              {listing.quantite || listing.quantite_disponible} disponibles
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Quantity */}
          <div>
            <label className={cn('block text-sm font-medium mb-1.5', textPrimary)}>
              Quantité souhaitée
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={quantite}
                onChange={(e) => setQuantite(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                max={listing.quantite || listing.quantite_disponible || 999}
                className={cn('w-24 px-3 py-2 border rounded-lg text-sm', inputBg)}
              />
              <span className={textMuted}>
                / {listing.quantite || listing.quantite_disponible} disponibles
              </span>
            </div>
          </div>

          {/* Price negotiation */}
          <div>
            <label className={cn('block text-sm font-medium mb-1.5', textPrimary)}>
              Prix proposé (optionnel)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={prixPropose}
                onChange={(e) => setPrixPropose(e.target.value)}
                min={0}
                step={0.01}
                placeholder={listing.prix_unitaire?.toFixed(2)}
                className={cn('w-28 px-3 py-2 border rounded-lg text-sm', inputBg)}
              />
              <span className={textMuted}>€/{listing.unite}</span>
            </div>
            <p className={cn('text-xs mt-1 flex items-center gap-1', textMuted)}>
              <DollarSign size={12} />
              Prix affiché : {formatCurrency(listing.prix_unitaire)}
            </p>
          </div>

          {/* Pickup mode */}
          <div>
            <label className={cn('block text-sm font-medium mb-2', textPrimary)}>
              Mode de retrait
            </label>
            <div className="space-y-2">
              <label className={cn(
                'flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
                modeRetrait === 'pickup'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'
              )}>
                <input
                  type="radio"
                  name="mode_retrait"
                  value="pickup"
                  checked={modeRetrait === 'pickup'}
                  onChange={() => setModeRetrait('pickup')}
                  className="w-4 h-4 text-primary-500"
                />
                <MapPin size={18} className={modeRetrait === 'pickup' ? 'text-primary-500' : textMuted} />
                <div className="flex-1">
                  <p className={cn('font-medium text-sm', textPrimary)}>Sur place</p>
                  <p className={cn('text-xs', textMuted)}>Gratuit - Vous récupérez</p>
                </div>
              </label>

              {listing.livraison_disponible && (
                <label className={cn(
                  'flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
                  modeRetrait === 'delivery'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'
                )}>
                  <input
                    type="radio"
                    name="mode_retrait"
                    value="delivery"
                    checked={modeRetrait === 'delivery'}
                    onChange={() => setModeRetrait('delivery')}
                    className="w-4 h-4 text-primary-500"
                  />
                  <Truck size={18} className={modeRetrait === 'delivery' ? 'text-primary-500' : textMuted} />
                  <div className="flex-1">
                    <p className={cn('font-medium text-sm', textPrimary)}>Livraison</p>
                    <p className={cn('text-xs', textMuted)}>+{formatCurrency(fraisLivraison)}</p>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className={cn('block text-sm font-medium mb-1.5', textPrimary)}>
              Date souhaitée
            </label>
            <input
              type="date"
              value={dateRetrait}
              onChange={(e) => setDateRetrait(e.target.value)}
              min={minDate.toISOString().split('T')[0]}
              className={cn('w-full px-3 py-2 border rounded-lg text-sm', inputBg)}
            />
          </div>

          {/* Notes */}
          <div>
            <label className={cn('block text-sm font-medium mb-1.5', textPrimary)}>
              Message au vendeur (optionnel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex: Je suis disponible le matin..."
              className={cn('w-full px-3 py-2 border rounded-lg text-sm resize-none', inputBg)}
            />
          </div>

          {/* Total */}
          <div className={cn('p-4 rounded-lg', isDark ? 'bg-slate-700' : 'bg-gray-50')}>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className={textSecondary}>Sous-total ({quantite} × {formatCurrency(prixUnitaire)})</span>
                <span className={textPrimary}>{formatCurrency(sousTotal)}</span>
              </div>
              {modeRetrait === 'delivery' && (
                <div className="flex justify-between text-sm">
                  <span className={textSecondary}>Livraison</span>
                  <span className={textPrimary}>+{formatCurrency(fraisLivraison)}</span>
                </div>
              )}
              <div className={cn('flex justify-between pt-2 border-t', isDark ? 'border-slate-600' : 'border-gray-200')}>
                <span className={cn('font-semibold', textPrimary)}>Total</span>
                <span className="font-bold text-primary-500 text-lg">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className={cn('p-3 rounded-lg flex items-center gap-2 text-sm', isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600')}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Annuler</Button>
        <Button variant="primary" onClick={handleSubmit} isLoading={sending}>
          <Send size={16} className="mr-1.5" />
          Envoyer la proposition
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ============ SELLER ACCEPTANCE MODAL ============

/**
 * SellerAcceptanceModal - Modal for accepting/rejecting a proposal
 */
export function SellerAcceptanceModal({
  isOpen,
  onClose,
  transaction,
  onAccept,
  onReject,
  isDark = false,
}) {
  const [adresse, setAdresse] = useState('');
  const [horaires, setHoraires] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [processing, setProcessing] = useState(false);

  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-gray-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';

  const handleAccept = async () => {
    if (!adresse.trim()) return;
    setProcessing(true);
    await onAccept?.(adresse, horaires);
    setProcessing(false);
    onClose();
  };

  const handleReject = async () => {
    setProcessing(true);
    await onReject?.(rejectReason);
    setProcessing(false);
    onClose();
  };

  if (!transaction) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isDark={isDark}>
      <ModalHeader>
        <ModalTitle>{showReject ? 'Refuser la proposition' : 'Accepter la proposition'}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        {/* Transaction summary */}
        <div className={cn('p-4 rounded-lg mb-4', isDark ? 'bg-slate-700' : 'bg-gray-50')}>
          <div className="flex items-center gap-3 mb-3">
            <Avatar user={transaction.buyer} size="md" />
            <div>
              <p className={cn('font-medium', textPrimary)}>{transaction.buyer?.nom}</p>
              <p className={cn('text-sm', textMuted)}>Acheteur</p>
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className={textSecondary}>Article</span>
              <span className={textPrimary}>{transaction.listing?.titre}</span>
            </div>
            <div className="flex justify-between">
              <span className={textSecondary}>Quantité</span>
              <span className={textPrimary}>{transaction.quantite_achetee} {transaction.listing?.unite}</span>
            </div>
            <div className="flex justify-between">
              <span className={textSecondary}>Prix proposé</span>
              <span className={textPrimary}>{formatCurrency(transaction.prix_unitaire_final)}/{transaction.listing?.unite}</span>
            </div>
            <div className="flex justify-between font-semibold pt-2 border-t border-dashed">
              <span className={textPrimary}>Total</span>
              <span className="text-primary-500">{formatCurrency(transaction.montant_total)}</span>
            </div>
          </div>
          {transaction.notes && (
            <div className={cn('mt-3 pt-3 border-t', isDark ? 'border-slate-600' : 'border-gray-200')}>
              <p className={cn('text-xs font-medium mb-1', textMuted)}>Message de l'acheteur :</p>
              <p className={cn('text-sm', textSecondary)}>{transaction.notes}</p>
            </div>
          )}
        </div>

        {showReject ? (
          // Reject form
          <div>
            <label className={cn('block text-sm font-medium mb-1.5', textPrimary)}>
              Raison du refus (optionnel)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Ex: Plus disponible, prix trop bas..."
              className={cn('w-full px-3 py-2 border rounded-lg text-sm resize-none', inputBg)}
            />
          </div>
        ) : (
          // Accept form
          <div className="space-y-4">
            <div>
              <label className={cn('block text-sm font-medium mb-1.5', textPrimary)}>
                Adresse de retrait *
              </label>
              <textarea
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                rows={2}
                placeholder="Ex: 15 rue des Artisans, 33000 Bordeaux"
                className={cn('w-full px-3 py-2 border rounded-lg text-sm resize-none', inputBg)}
              />
            </div>
            <div>
              <label className={cn('block text-sm font-medium mb-1.5', textPrimary)}>
                Horaires disponibles (optionnel)
              </label>
              <input
                type="text"
                value={horaires}
                onChange={(e) => setHoraires(e.target.value)}
                placeholder="Ex: Lundi-Vendredi 8h-18h"
                className={cn('w-full px-3 py-2 border rounded-lg text-sm', inputBg)}
              />
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {showReject ? (
          <>
            <Button variant="ghost" onClick={() => setShowReject(false)}>Retour</Button>
            <Button variant="danger" onClick={handleReject} isLoading={processing}>
              <XCircle size={16} className="mr-1.5" />
              Confirmer le refus
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setShowReject(true)}>
              Refuser
            </Button>
            <Button variant="primary" onClick={handleAccept} isLoading={processing} disabled={!adresse.trim()}>
              <CheckCircle size={16} className="mr-1.5" />
              Accepter
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}

// ============ BUYER CONFIRMATION MODAL ============

/**
 * BuyerConfirmationModal - Modal for confirming receipt
 */
export function BuyerConfirmationModal({
  isOpen,
  onClose,
  transaction,
  onConfirm,
  onDispute,
  isDark = false,
}) {
  const [processing, setProcessing] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-gray-600';

  const handleConfirm = async () => {
    setProcessing(true);
    await onConfirm?.();
    setProcessing(false);
    onClose();
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) return;
    setProcessing(true);
    await onDispute?.(disputeReason);
    setProcessing(false);
    onClose();
  };

  if (!transaction) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" isDark={isDark}>
      <ModalHeader>
        <ModalTitle>{showDispute ? 'Signaler un problème' : 'Confirmer la réception'}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        {showDispute ? (
          <div>
            <p className={cn('text-sm mb-4', textSecondary)}>
              Décrivez le problème rencontré lors de la transaction :
            </p>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              rows={4}
              placeholder="Ex: Article non conforme à la description..."
              className={cn('w-full px-3 py-2 border rounded-lg text-sm resize-none', inputBg)}
            />
          </div>
        ) : (
          <div className="text-center">
            <div className={cn('w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center', isDark ? 'bg-green-900/30' : 'bg-green-100')}>
              <Package size={32} className="text-green-500" />
            </div>
            <p className={cn('font-medium mb-2', textPrimary)}>
              Avez-vous bien reçu votre commande ?
            </p>
            <p className={cn('text-sm', textSecondary)}>
              {transaction.quantite_achetee} × {transaction.listing?.titre}
            </p>
            <p className="text-lg font-bold text-primary-500 mt-2">
              {formatCurrency(transaction.montant_total)}
            </p>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {showDispute ? (
          <>
            <Button variant="ghost" onClick={() => setShowDispute(false)}>Retour</Button>
            <Button variant="danger" onClick={handleDispute} isLoading={processing} disabled={!disputeReason.trim()}>
              <Flag size={16} className="mr-1.5" />
              Signaler
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setShowDispute(true)}>
              <AlertTriangle size={16} className="mr-1.5" />
              Problème
            </Button>
            <Button variant="primary" onClick={handleConfirm} isLoading={processing}>
              <ThumbsUp size={16} className="mr-1.5" />
              Oui, tout est OK
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}

// ============ EVALUATION MODAL ============

/**
 * EvaluationModal - Modal for rating the transaction
 */
export function EvaluationModal({
  isOpen,
  onClose,
  transaction,
  otherUser,
  userId,
  onSubmit,
  isDark = false,
}) {
  const [noteGlobale, setNoteGlobale] = useState(5);
  const [noteCommunication, setNoteCommunication] = useState(5);
  const [noteDelais, setNoteDelais] = useState(5);
  const [noteProduit, setNoteProduit] = useState(5);
  const [commentaire, setCommentaire] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-gray-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';

  const handleSubmit = async () => {
    setSubmitting(true);
    const result = await submitEvaluation({
      transaction_id: transaction.id,
      evaluated_id: otherUser.id,
      note_globale: noteGlobale,
      note_communication: noteCommunication,
      note_delais: noteDelais,
      note_produit: noteProduit,
      commentaire,
    }, userId);

    setSubmitting(false);

    if (result.success) {
      onSubmit?.();
      onClose();
    }
  };

  const StarRating = ({ value, onChange, label }) => (
    <div className="flex items-center justify-between">
      <span className={cn('text-sm', textSecondary)}>{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => onChange(star)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              size={20}
              className={star <= value ? 'text-amber-400 fill-amber-400' : textMuted}
            />
          </button>
        ))}
      </div>
    </div>
  );

  if (!transaction || !otherUser) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" isDark={isDark}>
      <ModalHeader>
        <ModalTitle>Évaluer {otherUser.nom}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div className="text-center mb-6">
          <Avatar user={otherUser} size="lg" className="mx-auto mb-3" />
          <p className={cn('font-medium', textPrimary)}>{otherUser.nom}</p>
          <p className={cn('text-sm', textMuted)}>
            {transaction.listing?.titre}
          </p>
        </div>

        <div className="space-y-4">
          {/* Global rating */}
          <div className={cn('p-4 rounded-lg', isDark ? 'bg-slate-700' : 'bg-gray-50')}>
            <p className={cn('text-sm font-medium mb-3 text-center', textPrimary)}>
              Note globale
            </p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setNoteGlobale(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    size={32}
                    className={star <= noteGlobale ? 'text-amber-400 fill-amber-400' : textMuted}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Detailed ratings */}
          <div className="space-y-3">
            <StarRating label="Communication" value={noteCommunication} onChange={setNoteCommunication} />
            <StarRating label="Respect des délais" value={noteDelais} onChange={setNoteDelais} />
            <StarRating label="État du produit" value={noteProduit} onChange={setNoteProduit} />
          </div>

          {/* Comment */}
          <div>
            <label className={cn('block text-sm font-medium mb-1.5', textPrimary)}>
              Commentaire (optionnel)
            </label>
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={3}
              placeholder="Partagez votre expérience..."
              className={cn('w-full px-3 py-2 border rounded-lg text-sm resize-none', inputBg)}
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Passer</Button>
        <Button variant="primary" onClick={handleSubmit} isLoading={submitting}>
          <Star size={16} className="mr-1.5" />
          Envoyer
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ============ TRANSACTION PROGRESS COMPONENT ============

/**
 * TransactionProgress - Visual progress indicator
 */
function TransactionProgress({ currentStep, status, isDark }) {
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-2">
        <span className={cn('text-sm font-medium', textPrimary)}>
          Étape {currentStep + 1}/{TRANSACTION_STEPS.length}
        </span>
        <span className={cn(
          'px-2 py-0.5 text-xs font-medium rounded-full',
          STATUS_COLORS[status]?.bg,
          STATUS_COLORS[status]?.text
        )}>
          {STATUS_LABELS[status]}
        </span>
      </div>

      {/* Progress bar */}
      <div className={cn('h-2 rounded-full overflow-hidden', isDark ? 'bg-slate-700' : 'bg-gray-200')}>
        <div
          className="h-full bg-primary-500 transition-all duration-500"
          style={{ width: `${((currentStep + 1) / TRANSACTION_STEPS.length) * 100}%` }}
        />
      </div>

      {/* Steps */}
      <div className="mt-4 space-y-2">
        {TRANSACTION_STEPS.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div key={step.id} className="flex items-center gap-3">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0',
                isCompleted ? 'bg-green-500 text-white' :
                isCurrent ? 'bg-primary-500 text-white' :
                isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-500'
              )}>
                {isCompleted ? <Check size={14} /> : index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium',
                  isCompleted || isCurrent ? textPrimary : textMuted
                )}>
                  {step.label}
                </p>
                <p className={cn('text-xs', textMuted)}>{step.description}</p>
              </div>
              {isCurrent && (
                <Clock size={16} className="text-primary-500 animate-pulse" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ TRANSACTION CARD COMPONENT ============

/**
 * TransactionCard - Summary card for transaction list
 */
export function TransactionCard({ transaction, userId, onClick, isDark }) {
  const isBuyer = transaction.buyer_id === userId;
  const otherUser = isBuyer ? transaction.seller : transaction.buyer;
  const currentStep = getCurrentStep(transaction.status);

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-gray-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 border rounded-xl text-left transition-all',
        cardBg,
        'hover:shadow-md'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Listing image */}
        {transaction.listing?.photos?.[0] ? (
          <img
            src={transaction.listing.photos[0]}
            alt=""
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className={cn('w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0', isDark ? 'bg-slate-700' : 'bg-gray-100')}>
            <Package size={24} className={textMuted} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Title and status */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className={cn('font-medium truncate', textPrimary)}>
              {transaction.listing?.titre}
            </p>
            <span className={cn(
              'px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0',
              STATUS_COLORS[transaction.status]?.bg,
              STATUS_COLORS[transaction.status]?.text
            )}>
              {STATUS_LABELS[transaction.status]}
            </span>
          </div>

          {/* Other user */}
          <p className={cn('text-sm', textSecondary)}>
            {isBuyer ? 'Vendeur' : 'Acheteur'} : {otherUser?.nom}
          </p>

          {/* Details */}
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className={textMuted}>
              {transaction.quantite_achetee} {transaction.listing?.unite}
            </span>
            <span className="font-semibold text-primary-500">
              {formatCurrency(transaction.montant_total)}
            </span>
          </div>

          {/* Progress mini */}
          <div className="flex items-center gap-1 mt-2">
            {TRANSACTION_STEPS.slice(0, 5).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full',
                  i <= currentStep ? 'bg-primary-500' : isDark ? 'bg-slate-700' : 'bg-gray-200'
                )}
              />
            ))}
          </div>
        </div>

        <ChevronRight size={20} className={textMuted} />
      </div>
    </button>
  );
}

// ============ TRANSACTION DETAIL COMPONENT ============

/**
 * TransactionDetail - Full transaction view
 */
export function TransactionDetail({
  transactionId,
  userId,
  onBack,
  onOpenMessages,
  showToast,
  isDark = false,
}) {
  const {
    transaction,
    loading,
    error,
    updating,
    isBuyer,
    isSeller,
    otherUser,
    currentStep,
    acceptProposal,
    rejectProposal,
    startPickup,
    confirmReceipt,
    cancelTransaction,
    reportDispute,
  } = useMarketplaceTransaction(transactionId, userId);

  // Modals
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showEvalModal, setShowEvalModal] = useState(false);

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-gray-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';
  const borderColor = isDark ? 'border-slate-700' : 'border-gray-200';

  const handleAccept = async (adresse, horaires) => {
    const result = await acceptProposal(adresse);
    if (result.success) {
      showToast?.('Proposition acceptée !', 'success');
    } else {
      showToast?.(result.error || 'Erreur', 'error');
    }
  };

  const handleReject = async (reason) => {
    const result = await rejectProposal(reason);
    if (result.success) {
      showToast?.('Proposition refusée', 'info');
    }
  };

  const handleConfirmReceipt = async () => {
    const result = await confirmReceipt();
    if (result.success) {
      showToast?.('Transaction terminée !', 'success');
      setShowEvalModal(true);
    }
  };

  const handleDispute = async (reason) => {
    const result = await reportDispute(reason);
    if (result.success) {
      showToast?.('Litige signalé', 'warning');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className={cn('animate-spin', textMuted)} />
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={48} className={cn('mx-auto mb-4', textMuted)} />
        <p className={textPrimary}>Transaction introuvable</p>
        <Button variant="ghost" onClick={onBack} className="mt-4">
          <ArrowLeft size={16} className="mr-1.5" />
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className={cn('p-2 rounded-lg', isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100')}
        >
          <ArrowLeft size={20} className={textPrimary} />
        </button>
        <div>
          <h1 className={cn('text-xl font-bold', textPrimary)}>
            Transaction #{transaction.id?.slice(-6).toUpperCase()}
          </h1>
          <p className={textMuted}>{formatDate(transaction.created_at)}</p>
        </div>
      </div>

      {/* Progress */}
      <div className={cn('p-4 border rounded-xl', cardBg)}>
        <TransactionProgress
          currentStep={currentStep}
          status={transaction.status}
          isDark={isDark}
        />
      </div>

      {/* Listing info */}
      <div className={cn('p-4 border rounded-xl', cardBg)}>
        <div className="flex gap-4">
          {transaction.listing?.photos?.[0] && (
            <img
              src={transaction.listing.photos[0]}
              alt=""
              className="w-24 h-24 rounded-lg object-cover"
            />
          )}
          <div className="flex-1">
            <h2 className={cn('font-semibold', textPrimary)}>{transaction.listing?.titre}</h2>
            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
              <div>
                <span className={textMuted}>Quantité :</span>
                <span className={cn('ml-1', textPrimary)}>{transaction.quantite_achetee} {transaction.listing?.unite}</span>
              </div>
              <div>
                <span className={textMuted}>Prix unitaire :</span>
                <span className={cn('ml-1', textPrimary)}>{formatCurrency(transaction.prix_unitaire_final)}</span>
              </div>
              <div>
                <span className={textMuted}>Mode :</span>
                <span className={cn('ml-1', textPrimary)}>
                  {transaction.mode_retrait === 'delivery' ? 'Livraison' : 'Sur place'}
                </span>
              </div>
              <div>
                <span className={textMuted}>Total :</span>
                <span className="ml-1 font-bold text-primary-500">{formatCurrency(transaction.montant_total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Other user */}
      <div className={cn('p-4 border rounded-xl', cardBg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar user={otherUser} size="md" />
            <div>
              <p className={cn('font-medium', textPrimary)}>{otherUser?.nom}</p>
              <p className={cn('text-sm', textMuted)}>
                {isBuyer ? 'Vendeur' : 'Acheteur'}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenMessages?.(transaction)}>
            <MessageCircle size={16} className="mr-1.5" />
            Messages
          </Button>
        </div>

        {/* Contact info (after confirmation) */}
        {transaction.status !== 'pending' && transaction.status !== 'cancelled' && (
          <div className={cn('mt-4 pt-4 border-t space-y-2', borderColor)}>
            {transaction.adresse_retrait && (
              <div className="flex items-start gap-2">
                <MapPin size={16} className={textMuted} />
                <p className={cn('text-sm', textSecondary)}>{transaction.adresse_retrait}</p>
              </div>
            )}
            {transaction.date_retrait_prevue && (
              <div className="flex items-center gap-2">
                <Calendar size={16} className={textMuted} />
                <p className={cn('text-sm', textSecondary)}>
                  {formatDate(transaction.date_retrait_prevue, { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
            )}
            {otherUser?.telephone && (
              <div className="flex items-center gap-2">
                <Phone size={16} className={textMuted} />
                <a href={`tel:${otherUser.telephone}`} className="text-sm text-primary-500">
                  {otherUser.telephone}
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions based on status and role */}
      <div className={cn('p-4 border rounded-xl', cardBg)}>
        {/* Pending - Seller can accept/reject */}
        {transaction.status === 'pending' && isSeller && (
          <div className="space-y-3">
            <p className={cn('text-sm', textSecondary)}>
              Vous avez reçu une proposition d'achat. Acceptez-la pour confirmer la transaction.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowAcceptModal(true)} className="flex-1">
                Voir les détails
              </Button>
              <Button variant="primary" onClick={() => setShowAcceptModal(true)} className="flex-1">
                <CheckCircle size={16} className="mr-1.5" />
                Accepter
              </Button>
            </div>
          </div>
        )}

        {/* Pending - Buyer waiting */}
        {transaction.status === 'pending' && isBuyer && (
          <div className="text-center py-4">
            <Clock size={32} className={cn('mx-auto mb-2', textMuted)} />
            <p className={cn('font-medium', textPrimary)}>En attente de réponse</p>
            <p className={cn('text-sm', textMuted)}>Le vendeur doit accepter votre proposition</p>
          </div>
        )}

        {/* Confirmed - Both can start pickup */}
        {transaction.status === 'confirmed' && (
          <div className="space-y-3">
            <p className={cn('text-sm', textSecondary)}>
              La transaction est confirmée. Rendez-vous au point de retrait convenu.
            </p>
            <Button
              variant="primary"
              fullWidth
              onClick={async () => {
                const result = await startPickup();
                if (result.success) showToast?.('Retrait en cours', 'info');
              }}
              isLoading={updating}
            >
              <Truck size={16} className="mr-1.5" />
              Démarrer le retrait
            </Button>
          </div>
        )}

        {/* In progress - Buyer can confirm receipt */}
        {transaction.status === 'in_progress' && isBuyer && (
          <div className="space-y-3">
            <p className={cn('text-sm', textSecondary)}>
              Confirmez la réception une fois que vous avez récupéré l'article.
            </p>
            <Button variant="primary" fullWidth onClick={() => setShowConfirmModal(true)}>
              <ThumbsUp size={16} className="mr-1.5" />
              Confirmer la réception
            </Button>
          </div>
        )}

        {/* Completed - Show evaluation prompt */}
        {transaction.status === 'completed' && (
          <div className="text-center py-4">
            <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
            <p className={cn('font-medium', textPrimary)}>Transaction terminée !</p>
            <p className={cn('text-sm mb-4', textMuted)}>N'oubliez pas d'évaluer votre expérience</p>
            <Button variant="primary" onClick={() => setShowEvalModal(true)}>
              <Star size={16} className="mr-1.5" />
              Évaluer {otherUser?.nom}
            </Button>
          </div>
        )}

        {/* Cancelled */}
        {transaction.status === 'cancelled' && (
          <div className="text-center py-4">
            <XCircle size={32} className={cn('mx-auto mb-2', textMuted)} />
            <p className={cn('font-medium', textPrimary)}>Transaction annulée</p>
            {transaction.cancellation_reason && (
              <p className={cn('text-sm', textMuted)}>{transaction.cancellation_reason}</p>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <SellerAcceptanceModal
        isOpen={showAcceptModal}
        onClose={() => setShowAcceptModal(false)}
        transaction={transaction}
        onAccept={handleAccept}
        onReject={handleReject}
        isDark={isDark}
      />

      <BuyerConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        transaction={transaction}
        onConfirm={handleConfirmReceipt}
        onDispute={handleDispute}
        isDark={isDark}
      />

      <EvaluationModal
        isOpen={showEvalModal}
        onClose={() => setShowEvalModal(false)}
        transaction={transaction}
        otherUser={otherUser}
        userId={userId}
        onSubmit={() => showToast?.('Merci pour votre évaluation !', 'success')}
        isDark={isDark}
      />
    </div>
  );
}

// ============ MAIN TRANSACTION FLOW COMPONENT ============

/**
 * TransactionFlow - Main component for managing marketplace transactions
 */
export default function TransactionFlow({
  userId,
  isDark = false,
  couleur = '#f97316',
  showToast,
  onOpenMessages,
  className,
}) {
  const [filter, setFilter] = useState('all');
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);

  const { transactions, loading, error, refresh } = useUserTransactions(userId, filter);

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';

  // Show detail view
  if (selectedTransactionId) {
    return (
      <TransactionDetail
        transactionId={selectedTransactionId}
        userId={userId}
        onBack={() => setSelectedTransactionId(null)}
        onOpenMessages={onOpenMessages}
        showToast={showToast}
        isDark={isDark}
      />
    );
  }

  // Stats
  const stats = useMemo(() => {
    const pending = transactions.filter(t => t.status === 'pending').length;
    const active = transactions.filter(t => ['confirmed', 'in_progress'].includes(t.status)).length;
    const completed = transactions.filter(t => t.status === 'completed').length;
    return { pending, active, completed };
  }, [transactions]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={cn('text-2xl font-bold', textPrimary)}>Mes transactions</h1>
          <p className={textMuted}>{transactions.length} transaction{transactions.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className={cn('p-4 border rounded-xl text-center', cardBg)}>
          <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
          <p className={cn('text-sm', textMuted)}>En attente</p>
        </div>
        <div className={cn('p-4 border rounded-xl text-center', cardBg)}>
          <p className="text-2xl font-bold text-blue-500">{stats.active}</p>
          <p className={cn('text-sm', textMuted)}>En cours</p>
        </div>
        <div className={cn('p-4 border rounded-xl text-center', cardBg)}>
          <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
          <p className={cn('text-sm', textMuted)}>Terminées</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { id: 'all', label: 'Toutes' },
          { id: 'buying', label: 'Achats' },
          { id: 'selling', label: 'Ventes' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filter === f.id
                ? 'bg-primary-500 text-white'
                : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className={cn('animate-spin', textMuted)} />
        </div>
      ) : transactions.length === 0 ? (
        <div className={cn('text-center py-12 border rounded-xl', cardBg)}>
          <Package size={48} className={cn('mx-auto mb-4', textMuted)} />
          <p className={cn('font-medium mb-2', textPrimary)}>Aucune transaction</p>
          <p className={cn('text-sm', textMuted)}>
            Vos achats et ventes apparaîtront ici
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map(transaction => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              userId={userId}
              onClick={() => setSelectedTransactionId(transaction.id)}
              isDark={isDark}
            />
          ))}
        </div>
      )}
    </div>
  );
}
