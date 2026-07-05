/**
 * RelanceModal - Universal reminder modal for devis and factures
 *
 * Sends a customizable email reminder via the Resend `send-email` Edge Function.
 * (SMS/Twilio was removed — email-only, aligned with the product focus.)
 *
 * @module RelanceModal
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Mail,
  Send,
  Clock,
  Euro,
  FileText,
  User,
  Edit3,
  History,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import Modal, { ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { toast } from '../../stores/toastStore';
import { sendDocumentEmail } from '../../lib/emailSender';
import { createRelanceRecord } from '../../services/RelanceService';
import { supabase, isDemo } from '../../supabaseClient';

/**
 * @typedef {'devis' | 'facture'} ItemType
 */

/**
 * @typedef {Object} RelanceItem
 * @property {ItemType} type - Type of item
 * @property {string} id - Item ID
 * @property {string} numero - Document number
 * @property {{ nom: string, email?: string }} client - Client info
 * @property {number} montant - Amount
 * @property {Date | string} dateEnvoi - Date sent
 */

/**
 * @typedef {Object} RelanceHistory
 * @property {Date | string} date - Relance date
 * @property {'email'} channel - Channel used
 */

/**
 * @typedef {Object} RelanceModalProps
 * @property {boolean} isOpen - Modal visibility
 * @property {() => void} onClose - Close handler
 * @property {RelanceItem} item - Item to relance
 * @property {() => void} [onSuccess] - Success callback
 * @property {RelanceHistory[]} [history] - Relance history
 * @property {{ nom: string, email?: string }} [entreprise] - Company info for signature
 */

// ============ TEMPLATES ============

const DEVIS_TEMPLATE = `Bonjour {client},

Je reviens vers vous concernant le devis #{numero} d'un montant de {montant}€ envoyé le {date}.

Avez-vous pu en prendre connaissance ? Je reste à votre disposition pour toute question ou pour organiser un rendez-vous.

Cordialement,
{artisan}`;

const FACTURE_TEMPLATE = `Bonjour {client},

Je me permets de vous rappeler la facture #{numero} d'un montant de {montant}€, échue le {date}.

Pourriez-vous me confirmer le règlement ou me contacter si vous rencontrez des difficultés ?

Merci par avance,
{artisan}`;

// ============ UTILITIES ============

/**
 * Format currency
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date in French
 */
function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Calculate days since date
 */
function daysSince(date) {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Format relative time
 */
function formatRelativeTime(days) {
  if (days === 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} jours`;
  if (days < 14) return 'il y a 1 semaine';
  if (days < 30) return `il y a ${Math.floor(days / 7)} semaines`;
  if (days < 60) return 'il y a 1 mois';
  return `il y a ${Math.floor(days / 30)} mois`;
}

/**
 * Replace template variables
 */
function processTemplate(template, data) {
  return template
    .replace(/{client}/g, data.clientName || 'Client')
    .replace(/{numero}/g, data.numero || '')
    .replace(/{montant}/g, data.montant?.toLocaleString('fr-FR') || '0')
    .replace(/{date}/g, data.date || '')
    .replace(/{artisan}/g, data.artisan || 'Votre artisan');
}

/**
 * Validate email
 */
function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============ HISTORY COMPONENT ============

function RelanceHistorySection({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        Aucune relance envoyée
      </div>
    );
  }

  const lastRelance = history[history.length - 1];
  const lastDate = lastRelance.date instanceof Date ? lastRelance.date : new Date(lastRelance.date);
  const daysSinceLast = daysSince(lastDate);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-sm">
        <History className="w-4 h-4 text-gray-400" />
        <span className="text-gray-600">
          Dernière relance : {formatRelativeTime(daysSinceLast)}
          <span className="text-gray-400 ml-1">(Email)</span>
        </span>
      </div>
      <div className="text-sm text-gray-500">
        Relances totales : {history.length}
      </div>
    </div>
  );
}

// ============ MAIN COMPONENT ============

/**
 * RelanceModal - Universal reminder modal (email-only)
 *
 * @param {RelanceModalProps} props
 */
export default function RelanceModal({
  isOpen,
  onClose,
  item,
  onSuccess,
  history = [],
  entreprise = { nom: 'Votre entreprise' },
}) {
  // State
  const [message, setMessage] = useState('');
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Derived values
  const daysSinceSent = useMemo(() => {
    if (!item?.dateEnvoi) return 0;
    return daysSince(item.dateEnvoi);
  }, [item?.dateEnvoi]);

  const canSendEmail = useMemo(() => isValidEmail(item?.client?.email), [item?.client?.email]);

  // Template data
  const templateData = useMemo(() => ({
    clientName: item?.client?.nom || 'Client',
    numero: item?.numero || '',
    montant: item?.montant || 0,
    date: item?.dateEnvoi ? formatDate(item.dateEnvoi) : '',
    artisan: entreprise?.nom || 'Votre artisan',
  }), [item, entreprise]);

  // Get appropriate template
  const getTemplate = useCallback(() => (
    item?.type === 'facture' ? FACTURE_TEMPLATE : DEVIS_TEMPLATE
  ), [item?.type]);

  // Initialize message from template
  useEffect(() => {
    if (isOpen && item) {
      setMessage(processTemplate(getTemplate(), templateData));
      setIsCustomizing(false);
      setError(null);
    }
  }, [isOpen, item, getTemplate, templateData]);

  // Reset to template
  const handleResetTemplate = useCallback(() => {
    setMessage(processTemplate(getTemplate(), templateData));
    setIsCustomizing(false);
  }, [getTemplate, templateData]);

  // Validate before send
  const validate = useCallback(() => {
    if (!message.trim()) {
      setError('Le message ne peut pas être vide');
      return false;
    }
    if (!canSendEmail) {
      setError('Email du client invalide ou manquant');
      return false;
    }
    setError(null);
    return true;
  }, [message, canSendEmail]);

  // Send relance (email via Resend)
  const handleSend = useCallback(async () => {
    if (!validate()) return;

    setIsLoading(true);
    setError(null);

    const subject = item.type === 'facture'
      ? `Rappel - Facture ${item.numero || '#'}`
      : `Rappel - Devis ${item.numero || '#'}`;

    try {
      const htmlMessage = message.split('\n').map(line =>
        line.trim() ? `<p>${line}</p>` : '<br/>'
      ).join('');

      // Send via Resend (skip actual send in demo)
      if (!isDemo) {
        await sendDocumentEmail({
          to: item.client.email,
          subject,
          bodyHtml: htmlMessage,
          fromName: entreprise?.nom,
          replyTo: entreprise?.email,
        });
      }

      // Persist relance record to localStorage + DB
      try {
        const record = createRelanceRecord(item.id, 'manual', 'email');
        const hist = JSON.parse(localStorage.getItem('cp_relance_history') || '{}');
        if (!hist[item.id]) hist[item.id] = [];
        hist[item.id].push(record);
        localStorage.setItem('cp_relance_history', JSON.stringify(hist));

        // Also persist to relance_executions table
        if (!isDemo && supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id) {
            await supabase.from('relance_executions').insert({
              user_id: user.id,
              document_id: item.id,
              document_type: item.type || 'devis',
              document_numero: item.numero,
              client_id: item.client_id || null,
              step_id: 'manual',
              step_name: 'Relance manuelle',
              step_delay: 0,
              sequence_type: item.type || 'devis',
              channel: 'email',
              status: 'sent',
              subject: subject || '',
              body: message || '',
              triggered_by: 'manual',
            }).then(({ error }) => {
              if (error) console.warn('Failed to save relance execution to DB:', error);
            });
          }
        }
      } catch (e) { console.warn('Failed to save relance history:', e); }

      // Success feedback
      toast.success(
        `${item?.type === 'facture' ? 'Facture' : 'Devis'} relancé !`,
        `Email envoyé à ${item?.client?.nom}`
      );

      // Close and callback
      onClose();
      onSuccess?.();
    } catch (err) {
      console.error('Relance error:', err);
      setError(err.message || "Erreur lors de l'envoi de la relance");
      toast.error('Erreur', "Impossible d'envoyer la relance");
    } finally {
      setIsLoading(false);
    }
  }, [validate, item, message, entreprise, onClose, onSuccess]);

  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader>
        <ModalTitle>Relancer le client</ModalTitle>
      </ModalHeader>

      <ModalBody className="space-y-5">
        {/* Item Summary */}
        <div className="bg-gray-50/50 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-900">
              {item.client?.nom || 'Client'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-gray-400" />
              <span>
                {item.type === 'facture' ? 'Facture' : 'Devis'} #{item.numero}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Euro className="w-4 h-4 text-gray-400" />
              <span className="font-semibold">{formatCurrency(item.montant)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>
              Envoyé {formatRelativeTime(daysSinceSent)}
              {daysSinceSent > 0 && (
                <span className="text-gray-400 ml-1">
                  ({formatDate(item.dateEnvoi)})
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Email destination */}
        <div className="flex items-center gap-2 text-sm">
          <Mail className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">
            {canSendEmail
              ? <>Relance par email à <span className="font-medium text-gray-900">{item.client?.email}</span></>
              : <span className="text-red-600">Email du client manquant ou invalide</span>}
          </span>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Message {isCustomizing && '(personnalisé)'}
            </label>
          </div>

          <textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (!isCustomizing) setIsCustomizing(true);
            }}
            rows={8}
            className={cn(
              'w-full px-4 py-3 rounded-xl border transition-colors',
              'text-sm text-gray-900',
              'bg-white',
              'placeholder-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
              'border-gray-200'
            )}
          />

          <div className="flex items-center justify-between">
            {isCustomizing ? (
              <button
                type="button"
                onClick={handleResetTemplate}
                className="text-xs text-primary-600 hover:underline flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                Réinitialiser le template
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsCustomizing(true)}
                className="text-xs text-primary-600 hover:underline flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                Personnaliser le message
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* History */}
        <div className="pt-3 border-t border-gray-200">
          <RelanceHistorySection history={history} />
        </div>
      </ModalBody>

      <ModalFooter>
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
        >
          Annuler
        </Button>
        <Button
          variant="primary"
          onClick={handleSend}
          isLoading={isLoading}
          disabled={isLoading || !canSendEmail}
          rightIcon={<Send className="w-4 h-4" />}
        >
          Envoyer
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ============ EXPORTS ============

export { RelanceModal };
