/**
 * RelanceModal - Universal reminder modal for devis and factures
 *
 * Allows sending reminders via Email, SMS, or both with customizable templates.
 *
 * @module RelanceModal
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  X,
  Mail,
  MessageSquare,
  Send,
  Loader2,
  Clock,
  Euro,
  FileText,
  User,
  Edit3,
  Check,
  History,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import Modal, { ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { toast } from '../../stores/toastStore';

/**
 * @typedef {'devis' | 'facture'} ItemType
 * @typedef {'email' | 'sms' | 'both'} RelanceChannel
 */

/**
 * @typedef {Object} RelanceItem
 * @property {ItemType} type - Type of item
 * @property {string} id - Item ID
 * @property {string} numero - Document number
 * @property {{ nom: string, email?: string, telephone?: string }} client - Client info
 * @property {number} montant - Amount
 * @property {Date | string} dateEnvoi - Date sent
 */

/**
 * @typedef {Object} RelanceHistory
 * @property {Date | string} date - Relance date
 * @property {'email' | 'sms'} channel - Channel used
 */

/**
 * @typedef {Object} RelanceModalProps
 * @property {boolean} isOpen - Modal visibility
 * @property {() => void} onClose - Close handler
 * @property {RelanceItem} item - Item to relance
 * @property {() => void} [onSuccess] - Success callback
 * @property {RelanceHistory[]} [history] - Relance history
 * @property {{ nom: string }} [entreprise] - Company info for signature
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

const SMS_DEVIS_TEMPLATE = `Bonjour, je reviens vers vous pour le devis #{numero} de {montant}€. Avez-vous des questions ? {artisan}`;

const SMS_FACTURE_TEMPLATE = `Rappel: Facture #{numero} de {montant}€ en attente de règlement. Merci de régulariser. {artisan}`;

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
 * Validate phone number (basic French format)
 */
function isValidPhone(phone) {
  if (!phone) return false;
  const cleaned = phone.replace(/\s/g, '');
  return /^(\+33|0)[1-9]\d{8}$/.test(cleaned);
}

/**
 * Validate email
 */
function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============ CHANNEL OPTION COMPONENT ============

function ChannelOption({ value, selected, onChange, icon: Icon, label, description, disabled, recommended }) {
  return (
    <label
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
        selected
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input
        type="radio"
        name="relance-channel"
        value={value}
        checked={selected}
        onChange={() => onChange(value)}
        disabled={disabled}
        className="sr-only"
      />
      <div
        className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
          selected
            ? 'border-primary-500 bg-primary-500'
            : 'border-gray-300 dark:border-slate-600'
        )}
      >
        {selected && <Check className="w-3 h-3 text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon className={cn('w-4 h-4', selected ? 'text-primary-600' : 'text-gray-500')} />
          <span className={cn('font-medium', selected ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300')}>
            {label}
          </span>
          {recommended && (
            <Badge variant="success" size="sm">
              Recommandé
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
    </label>
  );
}

// ============ HISTORY COMPONENT ============

function RelanceHistorySection({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 italic">
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
        <span className="text-gray-600 dark:text-gray-300">
          Dernière relance : {formatRelativeTime(daysSinceLast)}
          <span className="text-gray-400 dark:text-gray-500 ml-1">
            ({lastRelance.channel === 'email' ? 'Email' : 'SMS'})
          </span>
        </span>
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Relances totales : {history.length}
      </div>
    </div>
  );
}

// ============ MAIN COMPONENT ============

/**
 * RelanceModal - Universal reminder modal
 *
 * @example
 * <RelanceModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   item={{
 *     type: 'devis',
 *     id: 'd1',
 *     numero: '2025-005',
 *     client: { nom: 'Dupont Marie', email: 'marie@example.com', telephone: '0612345678' },
 *     montant: 14400,
 *     dateEnvoi: new Date('2025-01-17')
 *   }}
 *   onSuccess={() => refetch()}
 * />
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
  const [channel, setChannel] = useState('email');
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
  const canSendSMS = useMemo(() => isValidPhone(item?.client?.telephone), [item?.client?.telephone]);

  // Template data
  const templateData = useMemo(() => ({
    clientName: item?.client?.nom || 'Client',
    numero: item?.numero || '',
    montant: item?.montant || 0,
    date: item?.dateEnvoi ? formatDate(item.dateEnvoi) : '',
    artisan: entreprise?.nom || 'Votre artisan',
  }), [item, entreprise]);

  // Get appropriate template
  const getTemplate = useCallback((forSMS = false) => {
    if (item?.type === 'facture') {
      return forSMS ? SMS_FACTURE_TEMPLATE : FACTURE_TEMPLATE;
    }
    return forSMS ? SMS_DEVIS_TEMPLATE : DEVIS_TEMPLATE;
  }, [item?.type]);

  // Initialize message from template
  useEffect(() => {
    if (isOpen && item) {
      const template = getTemplate(channel === 'sms');
      setMessage(processTemplate(template, templateData));
      setIsCustomizing(false);
      setError(null);
    }
  }, [isOpen, item, channel, getTemplate, templateData]);

  // Handle channel change
  const handleChannelChange = useCallback((newChannel) => {
    setChannel(newChannel);
    // Update message for SMS vs Email
    if (!isCustomizing) {
      const template = getTemplate(newChannel === 'sms');
      setMessage(processTemplate(template, templateData));
    }
  }, [isCustomizing, getTemplate, templateData]);

  // Reset to template
  const handleResetTemplate = useCallback(() => {
    const template = getTemplate(channel === 'sms');
    setMessage(processTemplate(template, templateData));
    setIsCustomizing(false);
  }, [channel, getTemplate, templateData]);

  // Validate before send
  const validate = useCallback(() => {
    if (!message.trim()) {
      setError('Le message ne peut pas être vide');
      return false;
    }

    if (channel === 'email' && !canSendEmail) {
      setError('Email du client invalide ou manquant');
      return false;
    }

    if (channel === 'sms' && !canSendSMS) {
      setError('Numéro de téléphone invalide ou manquant');
      return false;
    }

    if (channel === 'both' && !canSendEmail && !canSendSMS) {
      setError('Aucun moyen de contact valide');
      return false;
    }

    // SMS length check
    if ((channel === 'sms' || channel === 'both') && message.length > 160) {
      setError('Le SMS doit faire moins de 160 caractères');
      return false;
    }

    setError(null);
    return true;
  }, [message, channel, canSendEmail, canSendSMS]);

  // Send relance
  const handleSend = useCallback(async () => {
    if (!validate()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call - replace with actual service
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // TODO: Call actual relance service
      // await RelanceService.send({
      //   itemType: item.type,
      //   itemId: item.id,
      //   channel,
      //   message,
      //   clientEmail: item.client.email,
      //   clientPhone: item.client.telephone,
      // });

      // Log for demo
      console.log('Relance sent:', {
        type: item?.type,
        id: item?.id,
        channel,
        message,
        to: channel === 'email' ? item?.client?.email : item?.client?.telephone,
      });

      // Success feedback
      const channelLabel = channel === 'both' ? 'Email et SMS' : channel === 'email' ? 'Email' : 'SMS';
      toast.success(
        `${item?.type === 'facture' ? 'Facture' : 'Devis'} relancé !`,
        `${channelLabel} envoyé à ${item?.client?.nom}`
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
  }, [validate, item, channel, message, onClose, onSuccess]);

  // Character count for SMS
  const charCount = message.length;
  const isOverLimit = channel === 'sms' && charCount > 160;

  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader>
        <ModalTitle>Relancer le client</ModalTitle>
      </ModalHeader>

      <ModalBody className="space-y-5">
        {/* Item Summary */}
        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-900 dark:text-white">
              {item.client?.nom || 'Client'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
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
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
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

        {/* Channel Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Canal de relance
          </label>
          <div className="space-y-2">
            <ChannelOption
              value="email"
              selected={channel === 'email'}
              onChange={handleChannelChange}
              icon={Mail}
              label="Email"
              description={canSendEmail ? item.client?.email : 'Email non disponible'}
              disabled={!canSendEmail}
              recommended={canSendEmail}
            />
            <ChannelOption
              value="sms"
              selected={channel === 'sms'}
              onChange={handleChannelChange}
              icon={MessageSquare}
              label="SMS"
              description={canSendSMS ? item.client?.telephone : 'Téléphone non disponible'}
              disabled={!canSendSMS}
            />
            <ChannelOption
              value="both"
              selected={channel === 'both'}
              onChange={handleChannelChange}
              icon={Send}
              label="Email + SMS"
              description="Envoyer par les deux canaux"
              disabled={!canSendEmail || !canSendSMS}
            />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Message {isCustomizing && '(personnalisé)'}
            </label>
            {channel === 'sms' && (
              <span
                className={cn(
                  'text-xs',
                  isOverLimit ? 'text-red-500' : 'text-gray-400'
                )}
              >
                {charCount}/160
              </span>
            )}
          </div>

          <textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (!isCustomizing) setIsCustomizing(true);
            }}
            rows={channel === 'sms' ? 4 : 8}
            className={cn(
              'w-full px-4 py-3 rounded-xl border transition-colors',
              'text-sm text-gray-900 dark:text-white',
              'bg-white dark:bg-slate-800',
              'placeholder-gray-400 dark:placeholder-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
              isOverLimit
                ? 'border-red-300 dark:border-red-700'
                : 'border-gray-200 dark:border-slate-700'
            )}
          />

          <div className="flex items-center justify-between">
            {isCustomizing ? (
              <button
                type="button"
                onClick={handleResetTemplate}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                Réinitialiser le template
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsCustomizing(true)}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                Personnaliser le message
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* History */}
        <div className="pt-3 border-t border-gray-200 dark:border-slate-700">
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
          disabled={isLoading || isOverLimit}
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
