/**
 * MessagingPanel Component
 * Main UI for marketplace messaging system
 *
 * @module MessagingPanel
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  MessageCircle,
  ArrowLeft,
  MoreVertical,
  Flag,
  Ban,
  X,
  Package,
  Calendar,
  Tag,
  CheckCircle,
  MapPin,
  ExternalLink,
  AlertCircle,
  Bell,
  BellOff,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  useMarketplaceMessages,
  useMarketplaceConversations,
  reportMessage,
  blockUser,
} from '../../hooks/useMarketplaceMessages';
import ConversationList, { Avatar } from './ConversationList';
import MessageThread from './MessageThread';
import Modal, { ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';

/**
 * @typedef {Object} Conversation
 * @property {string} id
 * @property {string} listing_id
 * @property {Object} listing
 * @property {Object} other_user
 * @property {string} last_message
 * @property {string} last_message_at
 * @property {number} unread_count
 */

/**
 * Conversation header with listing info
 */
function ConversationHeader({
  conversation,
  onBack,
  onMenu,
  isDark,
}) {
  const [showMenu, setShowMenu] = useState(false);

  const borderColor = isDark ? 'border-slate-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-gray-600';

  return (
    <div className={cn('flex items-center gap-3 p-4 border-b', borderColor)}>
      {/* Back button (mobile) */}
      <button
        onClick={onBack}
        className={cn(
          'p-2 rounded-lg transition-colors md:hidden',
          isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-600'
        )}
        aria-label="Retour"
      >
        <ArrowLeft size={20} />
      </button>

      {/* Avatar */}
      <Avatar user={conversation.other_user} size="md" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h2 className={cn('font-semibold truncate', textPrimary)}>
          {conversation.other_user?.nom || 'Utilisateur'}
        </h2>
        <div className="flex items-center gap-1.5">
          <Package size={12} className={textSecondary} />
          <p className={cn('text-sm truncate', textSecondary)}>
            {conversation.listing?.titre || 'Annonce'}
          </p>
        </div>
      </div>

      {/* View listing button */}
      <button
        onClick={() => {
          // Navigate to listing (would use router in production)
          console.log('View listing:', conversation.listing_id);
        }}
        className={cn(
          'p-2 rounded-lg transition-colors hidden sm:flex',
          isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-600'
        )}
        title="Voir l'annonce"
        aria-label="Voir l'annonce"
      >
        <ExternalLink size={18} />
      </button>

      {/* Menu button */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={cn(
            'p-2 rounded-lg transition-colors',
            isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-600'
          )}
          aria-label="Options"
          aria-expanded={showMenu}
        >
          <MoreVertical size={18} />
        </button>

        {/* Menu dropdown */}
        {showMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <div className={cn(
              'absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg border z-50 min-w-[180px]',
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
            )}>
              <button
                onClick={() => { onMenu?.('block'); setShowMenu(false); }}
                className={cn(
                  'w-full px-4 py-2.5 text-left text-sm flex items-center gap-2',
                  isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-gray-50 text-gray-700'
                )}
              >
                <Ban size={16} className="text-red-500" />
                Bloquer l'utilisateur
              </button>
              <button
                onClick={() => { onMenu?.('report'); setShowMenu(false); }}
                className={cn(
                  'w-full px-4 py-2.5 text-left text-sm flex items-center gap-2',
                  isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-gray-50 text-gray-700'
                )}
              >
                <Flag size={16} className="text-orange-500" />
                Signaler l'annonce
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Quick action modals
 */
function AppointmentModal({ isOpen, onClose, onSubmit, isDark }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    if (!date || !time) return;
    onSubmit({ date, time, note });
    onClose();
    setDate('');
    setTime('');
    setNote('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" isDark={isDark}>
      <ModalHeader>
        <ModalTitle>Proposer un rendez-vous</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <div>
            <label className={cn('block text-sm font-medium mb-1.5', isDark ? 'text-slate-200' : 'text-gray-700')}>
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className={cn(
                'w-full px-3 py-2 border rounded-lg text-sm',
                isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'
              )}
            />
          </div>
          <div>
            <label className={cn('block text-sm font-medium mb-1.5', isDark ? 'text-slate-200' : 'text-gray-700')}>
              Heure
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={cn(
                'w-full px-3 py-2 border rounded-lg text-sm',
                isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'
              )}
            />
          </div>
          <div>
            <label className={cn('block text-sm font-medium mb-1.5', isDark ? 'text-slate-200' : 'text-gray-700')}>
              Note (optionnel)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Ex: Je passerai avec une camionnette"
              className={cn(
                'w-full px-3 py-2 border rounded-lg text-sm resize-none',
                isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-200'
              )}
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Annuler</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!date || !time}>
          <Calendar size={16} className="mr-1.5" />
          Proposer
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function NegotiateModal({ isOpen, onClose, onSubmit, listing, isDark }) {
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    if (!price) return;
    onSubmit({ price: parseFloat(price), note });
    onClose();
    setPrice('');
    setNote('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" isDark={isDark}>
      <ModalHeader>
        <ModalTitle>Proposer un prix</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          {listing && (
            <div className={cn('p-3 rounded-lg text-sm', isDark ? 'bg-slate-700' : 'bg-gray-50')}>
              <p className={isDark ? 'text-slate-300' : 'text-gray-600'}>
                Prix affiché : <span className="font-semibold">{listing.prix_unitaire?.toFixed(2)}€/{listing.unite}</span>
              </p>
            </div>
          )}
          <div>
            <label className={cn('block text-sm font-medium mb-1.5', isDark ? 'text-slate-200' : 'text-gray-700')}>
              Votre offre (€)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min="0"
              step="0.01"
              placeholder="Ex: 1.50"
              className={cn(
                'w-full px-3 py-2 border rounded-lg text-sm',
                isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'
              )}
            />
          </div>
          <div>
            <label className={cn('block text-sm font-medium mb-1.5', isDark ? 'text-slate-200' : 'text-gray-700')}>
              Message (optionnel)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Ex: Je prends tout le lot"
              className={cn(
                'w-full px-3 py-2 border rounded-lg text-sm resize-none',
                isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-200'
              )}
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Annuler</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!price}>
          <Tag size={16} className="mr-1.5" />
          Proposer
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function BlockConfirmModal({ isOpen, onClose, onConfirm, userName, isDark }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" isDark={isDark}>
      <ModalHeader>
        <ModalTitle>Bloquer l'utilisateur</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p className={isDark ? 'text-slate-300' : 'text-gray-600'}>
          Voulez-vous vraiment bloquer <strong>{userName}</strong> ?
        </p>
        <p className={cn('text-sm mt-2', isDark ? 'text-slate-400' : 'text-gray-500')}>
          Vous ne recevrez plus de messages de cet utilisateur et ne verrez plus ses annonces.
        </p>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Annuler</Button>
        <Button variant="danger" onClick={onConfirm}>
          <Ban size={16} className="mr-1.5" />
          Bloquer
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/**
 * Empty state when no conversation is selected
 */
function NoConversationSelected({ isDark }) {
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className={cn('p-6 rounded-full mb-4', isDark ? 'bg-slate-700' : 'bg-gray-100')}>
        <MessageCircle size={48} className={textMuted} />
      </div>
      <h3 className={cn('text-lg font-semibold mb-2', isDark ? 'text-white' : 'text-gray-900')}>
        Sélectionnez une conversation
      </h3>
      <p className={cn('text-sm text-center max-w-xs', textMuted)}>
        Choisissez une conversation dans la liste pour afficher les messages.
      </p>
    </div>
  );
}

/**
 * MessagingPanel - Main marketplace messaging UI
 *
 * @param {Object} props
 * @param {string} props.userId - Current user's ID
 * @param {string} [props.initialListingId] - Pre-select a listing conversation
 * @param {string} [props.initialOtherUserId] - Pre-select a user conversation
 * @param {boolean} [props.isDark] - Dark mode
 * @param {string} [props.couleur] - Accent color
 * @param {Function} [props.showToast] - Toast notification function
 * @param {string} [props.className] - Additional CSS classes
 */
export default function MessagingPanel({
  userId,
  initialListingId,
  initialOtherUserId,
  isDark = false,
  couleur = '#f97316',
  showToast,
  className,
}) {
  // Active conversation
  const [activeConversation, setActiveConversation] = useState(null);
  const [showMobileThread, setShowMobileThread] = useState(false);

  // Modals
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showNegotiateModal, setShowNegotiateModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [reportingMessage, setReportingMessage] = useState(null);

  // Fetch conversations
  const {
    conversations,
    loading: conversationsLoading,
    error: conversationsError,
    totalUnread,
    refresh: refreshConversations,
  } = useMarketplaceConversations(userId);

  // Fetch messages for active conversation
  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
    sending,
    sendMessage,
  } = useMarketplaceMessages(
    activeConversation?.listing_id,
    activeConversation?.other_user?.id,
    userId
  );

  // Theme classes
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';
  const borderColor = isDark ? 'border-slate-700' : 'border-gray-200';

  // Handle initial selection
  useEffect(() => {
    if (initialListingId && initialOtherUserId && conversations.length > 0) {
      const conv = conversations.find(
        c => c.listing_id === initialListingId && c.other_user?.id === initialOtherUserId
      );
      if (conv) {
        setActiveConversation(conv);
        setShowMobileThread(true);
      }
    }
  }, [initialListingId, initialOtherUserId, conversations]);

  // Handle conversation selection
  const handleSelectConversation = useCallback((conversation) => {
    setActiveConversation(conversation);
    setShowMobileThread(true);
  }, []);

  // Handle back button (mobile)
  const handleBack = useCallback(() => {
    setShowMobileThread(false);
  }, []);

  // Handle send message
  const handleSendMessage = useCallback(async (text) => {
    const result = await sendMessage(text);

    if (!result.success && result.error) {
      showToast?.(result.error, result.warning ? 'warning' : 'error');
    }

    return result;
  }, [sendMessage, showToast]);

  // Handle quick actions
  const handleQuickAction = useCallback((actionId) => {
    switch (actionId) {
      case 'appointment':
        setShowAppointmentModal(true);
        break;
      case 'negotiate':
        setShowNegotiateModal(true);
        break;
      case 'sold':
        // Mark as sold
        const soldMessage = `✅ Article marqué comme vendu ! Merci pour votre achat.`;
        sendMessage(soldMessage);
        showToast?.('Article marqué comme vendu', 'success');
        break;
      case 'location':
        // Send location (would integrate with maps in production)
        showToast?.('Fonctionnalité de partage d\'adresse à venir', 'info');
        break;
      default:
        break;
    }
  }, [sendMessage, showToast]);

  // Handle appointment submission
  const handleAppointmentSubmit = useCallback(({ date, time, note }) => {
    const formattedDate = new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const message = `📅 Proposition de rendez-vous :\n\n${formattedDate} à ${time}${note ? `\n\n${note}` : ''}`;
    sendMessage(message);
    showToast?.('Rendez-vous proposé', 'success');
  }, [sendMessage, showToast]);

  // Handle price negotiation submission
  const handleNegotiateSubmit = useCallback(({ price, note }) => {
    const message = `💰 Proposition de prix :\n\n${price.toFixed(2)}€${note ? `\n\n${note}` : ''}`;
    sendMessage(message);
    showToast?.('Offre envoyée', 'success');
  }, [sendMessage, showToast]);

  // Handle menu actions
  const handleMenuAction = useCallback((action) => {
    switch (action) {
      case 'block':
        setShowBlockModal(true);
        break;
      case 'report':
        showToast?.('Signalement envoyé', 'success');
        break;
      default:
        break;
    }
  }, [showToast]);

  // Handle block user
  const handleBlockUser = useCallback(async () => {
    if (!activeConversation?.other_user?.id) return;

    const result = await blockUser(userId, activeConversation.other_user.id);

    if (result.success) {
      showToast?.('Utilisateur bloqué', 'success');
      setActiveConversation(null);
      setShowMobileThread(false);
      refreshConversations();
    } else {
      showToast?.('Erreur lors du blocage', 'error');
    }

    setShowBlockModal(false);
  }, [userId, activeConversation, showToast, refreshConversations]);

  // Handle report message
  const handleReportMessage = useCallback(async (message) => {
    const result = await reportMessage(message.id, 'inappropriate', userId);

    if (result.success) {
      showToast?.('Message signalé', 'success');
    } else {
      showToast?.('Erreur lors du signalement', 'error');
    }
  }, [userId, showToast]);

  return (
    <div className={cn('flex h-[calc(100vh-200px)] min-h-[500px]', className)}>
      {/* Conversations sidebar */}
      <div
        className={cn(
          'w-full md:w-80 lg:w-96 flex-shrink-0 border-r flex flex-col',
          cardBg,
          borderColor,
          showMobileThread ? 'hidden md:flex' : 'flex'
        )}
      >
        {/* Header */}
        <div className={cn('p-4 border-b', borderColor)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle size={24} style={{ color: couleur }} />
              <h1 className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                Messages
              </h1>
              {totalUnread > 0 && (
                <span className="px-2 py-0.5 bg-primary-500 text-white text-xs font-bold rounded-full">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Conversation list */}
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversation?.id}
          onSelectConversation={handleSelectConversation}
          loading={conversationsLoading}
          error={conversationsError}
          isDark={isDark}
          className="flex-1"
        />
      </div>

      {/* Message thread */}
      <div
        className={cn(
          'flex-1 flex flex-col',
          cardBg,
          showMobileThread ? 'flex' : 'hidden md:flex'
        )}
      >
        {activeConversation ? (
          <>
            {/* Conversation header */}
            <ConversationHeader
              conversation={activeConversation}
              onBack={handleBack}
              onMenu={handleMenuAction}
              isDark={isDark}
            />

            {/* Message thread */}
            <MessageThread
              messages={messages}
              currentUserId={userId}
              onSendMessage={handleSendMessage}
              sending={sending}
              loading={messagesLoading}
              error={messagesError}
              onQuickAction={handleQuickAction}
              onReportMessage={handleReportMessage}
              isDark={isDark}
              className="flex-1"
            />
          </>
        ) : (
          <NoConversationSelected isDark={isDark} />
        )}
      </div>

      {/* Modals */}
      <AppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        onSubmit={handleAppointmentSubmit}
        isDark={isDark}
      />

      <NegotiateModal
        isOpen={showNegotiateModal}
        onClose={() => setShowNegotiateModal(false)}
        onSubmit={handleNegotiateSubmit}
        listing={activeConversation?.listing}
        isDark={isDark}
      />

      <BlockConfirmModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        onConfirm={handleBlockUser}
        userName={activeConversation?.other_user?.nom}
        isDark={isDark}
      />
    </div>
  );
}

/**
 * MessagingBadge - Unread count badge for navigation
 */
export function MessagingBadge({ userId, className }) {
  const { totalUnread } = useMarketplaceConversations(userId);

  if (totalUnread === 0) return null;

  return (
    <span className={cn(
      'absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center',
      className
    )}>
      {totalUnread > 99 ? '99+' : totalUnread}
    </span>
  );
}
