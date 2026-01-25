/**
 * MessageThread Component
 * Displays message bubbles and input for a conversation
 *
 * @module MessageThread
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Loader2,
  Image,
  MapPin,
  Calendar,
  Tag,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  Flag,
  Ban,
  Paperclip,
  X,
  ChevronDown,
  Smile,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  formatBubbleTime,
  filterSensitiveInfo,
  containsSensitiveInfo,
} from '../../hooks/useMarketplaceMessages';
import { Avatar } from './ConversationList';

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} sender_id
 * @property {string} message
 * @property {string} created_at
 * @property {Object} sender
 * @property {string[]} [attachments]
 */

// Quick message templates
const MESSAGE_TEMPLATES = [
  { id: 'available', text: 'Bonjour, est-ce que c\'est encore disponible ?', icon: '👋' },
  { id: 'price', text: 'Quel est votre meilleur prix pour le lot complet ?', icon: '💰' },
  { id: 'pickup', text: 'Je peux passer chercher demain, ça vous convient ?', icon: '🚗' },
  { id: 'location', text: 'Pouvez-vous m\'envoyer l\'adresse exacte ?', icon: '📍' },
  { id: 'thanks', text: 'Merci pour votre réponse !', icon: '🙏' },
];

// Quick actions
const QUICK_ACTIONS = [
  { id: 'appointment', label: 'Proposer RDV', icon: Calendar, color: 'text-blue-500' },
  { id: 'negotiate', label: 'Proposer prix', icon: Tag, color: 'text-green-500' },
  { id: 'sold', label: 'Marquer vendu', icon: CheckCircle, color: 'text-purple-500' },
  { id: 'location', label: 'Envoyer adresse', icon: MapPin, color: 'text-orange-500' },
];

/**
 * Message bubble component
 */
function MessageBubble({ message, isOwn, isDark, onReport }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const ownBubbleBg = 'bg-primary-500 text-white';
  const ownBubbleTime = 'text-primary-100';
  const otherBubbleBg = isDark ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-900';
  const otherBubbleTime = isDark ? 'text-slate-400' : 'text-gray-500';

  return (
    <div
      className={cn(
        'flex mb-4 group',
        isOwn ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Avatar for other user */}
      {!isOwn && (
        <Avatar user={message.sender} size="sm" className="mr-2 flex-shrink-0 mt-1" />
      )}

      <div className="relative max-w-[70%]">
        {/* Message bubble */}
        <div
          className={cn(
            'px-4 py-2.5 rounded-2xl',
            isOwn
              ? cn(ownBubbleBg, 'rounded-br-sm')
              : cn(otherBubbleBg, 'rounded-bl-sm')
          )}
        >
          {/* Message text */}
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.message}
          </p>

          {/* Attachments */}
          {message.attachments?.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Pièce jointe ${index + 1}`}
                  className="max-w-full rounded-lg cursor-pointer hover:opacity-90"
                  onClick={() => window.open(url, '_blank')}
                />
              ))}
            </div>
          )}

          {/* Time */}
          <span className={cn(
            'text-xs mt-1.5 block text-right',
            isOwn ? ownBubbleTime : otherBubbleTime
          )}>
            {formatBubbleTime(message.created_at)}
          </span>
        </div>

        {/* Menu button (for other's messages) */}
        {!isOwn && (
          <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={cn(
                'p-1.5 rounded-full transition-colors',
                isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-gray-200 text-gray-400'
              )}
              aria-label="Options du message"
            >
              <MoreVertical size={16} />
            </button>

            {/* Dropdown menu */}
            {showMenu && (
              <div className={cn(
                'absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg border z-10 min-w-[140px]',
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
              )}>
                <button
                  onClick={() => { onReport?.(message); setShowMenu(false); }}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm flex items-center gap-2',
                    isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-gray-50 text-gray-700'
                  )}
                >
                  <Flag size={14} className="text-red-500" />
                  Signaler
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Date separator for messages
 */
function DateSeparator({ date, isDark }) {
  const formattedDate = new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="flex items-center justify-center my-4">
      <span className={cn(
        'px-3 py-1 text-xs font-medium rounded-full',
        isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-500'
      )}>
        {formattedDate}
      </span>
    </div>
  );
}

/**
 * Quick templates dropdown
 */
function TemplatesDropdown({ onSelect, isDark }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'p-2 rounded-lg transition-colors',
          isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
        )}
        title="Messages rapides"
        aria-label="Messages rapides"
        aria-expanded={isOpen}
      >
        <Smile size={20} />
      </button>

      {isOpen && (
        <div className={cn(
          'absolute bottom-full left-0 mb-2 py-2 rounded-xl shadow-lg border w-64 z-20',
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        )}>
          <p className={cn('px-3 pb-2 text-xs font-semibold uppercase tracking-wide', isDark ? 'text-slate-400' : 'text-gray-500')}>
            Réponses rapides
          </p>
          {MESSAGE_TEMPLATES.map(template => (
            <button
              key={template.id}
              onClick={() => { onSelect(template.text); setIsOpen(false); }}
              className={cn(
                'w-full px-3 py-2 text-left text-sm flex items-start gap-2',
                isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-gray-50 text-gray-700'
              )}
            >
              <span className="flex-shrink-0">{template.icon}</span>
              <span className="line-clamp-2">{template.text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Quick actions bar
 */
function QuickActionsBar({ onAction, isDark }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {QUICK_ACTIONS.map(action => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              isDark
                ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            <Icon size={14} className={action.color} />
            {action.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Sensitive info warning banner
 */
function SensitiveInfoWarning({ onClose, isDark }) {
  return (
    <div className={cn(
      'flex items-start gap-2 p-3 rounded-lg mb-3',
      isDark ? 'bg-amber-900/30 text-amber-200' : 'bg-amber-50 text-amber-800'
    )}>
      <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <p className="font-medium">Attention</p>
        <p className="text-xs opacity-80 mt-0.5">
          Pour votre sécurité, les numéros de téléphone et emails sont masqués. Utilisez la messagerie pour organiser la transaction.
        </p>
      </div>
      <button onClick={onClose} className="flex-shrink-0 p-1 hover:opacity-70">
        <X size={16} />
      </button>
    </div>
  );
}

/**
 * MessageThread - Displays messages and input for a conversation
 *
 * @param {Object} props
 * @param {Message[]} props.messages - List of messages
 * @param {string} props.currentUserId - Current user's ID
 * @param {Function} props.onSendMessage - Called when sending a message
 * @param {boolean} [props.sending] - Sending state
 * @param {boolean} [props.loading] - Loading state
 * @param {string} [props.error] - Error message
 * @param {Function} [props.onQuickAction] - Quick action handler
 * @param {Function} [props.onReportMessage] - Report message handler
 * @param {boolean} [props.isDark] - Dark mode
 * @param {string} [props.className] - Additional CSS classes
 */
export default function MessageThread({
  messages = [],
  currentUserId,
  onSendMessage,
  sending = false,
  loading = false,
  error = null,
  onQuickAction,
  onReportMessage,
  isDark = false,
  className,
}) {
  const [inputText, setInputText] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [inputWarning, setInputWarning] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Theme classes
  const borderColor = isDark ? 'border-slate-700' : 'border-gray-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-200';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Group messages by date
  const groupedMessages = React.useMemo(() => {
    const groups = [];
    let currentDate = null;

    messages.forEach(message => {
      const messageDate = new Date(message.created_at).toDateString();

      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({ type: 'date', date: message.created_at });
      }

      groups.push({ type: 'message', message });
    });

    return groups;
  }, [messages]);

  // Handle input change with sensitive info check
  const handleInputChange = useCallback((e) => {
    const text = e.target.value;
    setInputText(text);

    // Check for sensitive info
    if (containsSensitiveInfo(text)) {
      setInputWarning('Les numéros de téléphone et emails seront masqués pour votre sécurité.');
    } else {
      setInputWarning(null);
    }
  }, []);

  // Handle send message
  const handleSend = useCallback(async () => {
    if (!inputText.trim() || sending) return;

    const result = await onSendMessage(inputText);

    if (result?.success) {
      setInputText('');
      setInputWarning(null);
    } else if (result?.warning) {
      setShowWarning(true);
    }
  }, [inputText, sending, onSendMessage]);

  // Handle enter key
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Handle template selection
  const handleTemplateSelect = useCallback((text) => {
    setInputText(text);
    inputRef.current?.focus();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <Loader2 size={32} className={cn('animate-spin', textMuted)} />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4"
        role="log"
        aria-label="Messages"
        aria-live="polite"
      >
        {/* Security warning */}
        {showWarning && (
          <SensitiveInfoWarning
            onClose={() => setShowWarning(false)}
            isDark={isDark}
          />
        )}

        {/* Empty state */}
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className={cn('text-sm', textMuted)}>
              Aucun message pour l'instant.
            </p>
            <p className={cn('text-xs mt-1', textMuted)}>
              Envoyez un message pour commencer la conversation.
            </p>
          </div>
        ) : (
          // Messages
          <>
            {groupedMessages.map((item, index) => {
              if (item.type === 'date') {
                return <DateSeparator key={`date-${index}`} date={item.date} isDark={isDark} />;
              }

              const message = item.message;
              const isOwn = message.sender_id === currentUserId;

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={isOwn}
                  isDark={isDark}
                  onReport={onReportMessage}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Quick actions */}
      {onQuickAction && (
        <div className={cn('px-4 py-2 border-t', borderColor)}>
          <QuickActionsBar onAction={onQuickAction} isDark={isDark} />
        </div>
      )}

      {/* Input warning */}
      {inputWarning && (
        <div className={cn(
          'mx-4 px-3 py-2 rounded-lg text-xs flex items-center gap-2',
          isDark ? 'bg-amber-900/30 text-amber-200' : 'bg-amber-50 text-amber-700'
        )}>
          <AlertCircle size={14} />
          {inputWarning}
        </div>
      )}

      {/* Input area */}
      <div className={cn('p-4 border-t', borderColor)}>
        <div className="flex items-end gap-2">
          {/* Templates button */}
          <TemplatesDropdown onSelect={handleTemplateSelect} isDark={isDark} />

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Écrivez un message..."
              rows={1}
              className={cn(
                'w-full px-4 py-2.5 border rounded-xl text-sm resize-none',
                inputBg,
                'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
                'max-h-32'
              )}
              style={{
                minHeight: '42px',
                height: 'auto',
              }}
              aria-label="Message"
              disabled={sending}
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || sending}
            className={cn(
              'p-2.5 rounded-xl transition-colors flex-shrink-0',
              inputText.trim() && !sending
                ? 'bg-primary-500 text-white hover:bg-primary-600'
                : isDark ? 'bg-slate-700 text-slate-500' : 'bg-gray-100 text-gray-400',
              'disabled:cursor-not-allowed'
            )}
            aria-label="Envoyer"
          >
            {sending ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>

        {/* Error message */}
        {error && (
          <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
            <AlertCircle size={12} />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

// Export components for reuse
export { MessageBubble, DateSeparator, QuickActionsBar, MESSAGE_TEMPLATES, QUICK_ACTIONS };
