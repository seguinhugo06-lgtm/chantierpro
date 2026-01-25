/**
 * ConversationList Component
 * Displays list of marketplace conversations
 *
 * @module ConversationList
 */

import React, { useMemo } from 'react';
import { MessageCircle, Search, Loader2, AlertCircle, Package } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatMessageTime } from '../../hooks/useMarketplaceMessages';

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
 * Avatar component for conversation cards
 */
function Avatar({ user, size = 'md', className }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const initials = user?.nom
    ? user.nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.nom || 'Avatar'}
        className={cn('rounded-full object-cover', sizeClasses[size], className)}
      />
    );
  }

  // Generate color from name
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-red-500',
  ];
  const colorIndex = user?.nom
    ? user.nom.charCodeAt(0) % colors.length
    : 0;

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center text-white font-medium',
        sizeClasses[size],
        colors[colorIndex],
        className
      )}
    >
      {initials}
    </div>
  );
}

/**
 * Single conversation card
 */
function ConversationCard({
  conversation,
  isActive,
  onClick,
  isDark,
}) {
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const activeBg = isDark ? 'bg-slate-700' : 'bg-primary-50';
  const hoverBg = isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-gray-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';
  const unreadBg = isDark ? 'bg-blue-900/30' : 'bg-blue-50';

  const hasUnread = conversation.unread_count > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-3 rounded-lg text-left transition-all duration-200',
        isActive ? activeBg : hasUnread ? unreadBg : cardBg,
        !isActive && hoverBg,
        'focus:outline-none focus:ring-2 focus:ring-primary-500/50'
      )}
      aria-label={`Conversation avec ${conversation.other_user?.nom || 'Utilisateur'}`}
      aria-current={isActive ? 'true' : undefined}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <Avatar user={conversation.other_user} size="md" />
          {/* Online indicator - would be real-time in production */}
          {hasUnread && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Top: Name + Time */}
          <div className="flex items-center justify-between mb-1">
            <p className={cn('font-medium text-sm truncate', textPrimary, hasUnread && 'font-semibold')}>
              {conversation.other_user?.nom || 'Utilisateur'}
            </p>
            <span className={cn('text-xs flex-shrink-0 ml-2', hasUnread ? 'text-primary-600 dark:text-primary-400 font-medium' : textMuted)}>
              {formatMessageTime(conversation.last_message_at)}
            </span>
          </div>

          {/* Middle: Listing title */}
          <div className="flex items-center gap-1.5 mb-1">
            <Package size={12} className={textMuted} />
            <p className={cn('text-xs truncate', textSecondary)}>
              {conversation.listing?.titre || 'Annonce'}
            </p>
          </div>

          {/* Bottom: Last message preview */}
          <p className={cn(
            'text-sm truncate',
            hasUnread ? (isDark ? 'text-white font-medium' : 'text-gray-900 font-medium') : textSecondary
          )}>
            {conversation.last_message || 'Aucun message'}
          </p>
        </div>

        {/* Unread badge */}
        {hasUnread && (
          <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-primary-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
          </span>
        )}
      </div>
    </button>
  );
}

/**
 * Empty state when no conversations
 */
function EmptyState({ isDark }) {
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className={cn('p-4 rounded-full mb-4', isDark ? 'bg-slate-700' : 'bg-gray-100')}>
        <MessageCircle size={32} className={textMuted} />
      </div>
      <h3 className={cn('text-lg font-semibold mb-2', textPrimary)}>
        Aucune conversation
      </h3>
      <p className={cn('text-sm text-center', textMuted)}>
        Vos conversations avec les vendeurs et acheteurs apparaîtront ici.
      </p>
    </div>
  );
}

/**
 * Loading skeleton for conversation list
 */
function ConversationSkeleton({ isDark }) {
  const skeletonBg = isDark ? 'bg-slate-700' : 'bg-gray-200';

  return (
    <div className="p-3 animate-pulse">
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-full', skeletonBg)} />
        <div className="flex-1 space-y-2">
          <div className="flex justify-between">
            <div className={cn('h-4 w-24 rounded', skeletonBg)} />
            <div className={cn('h-3 w-12 rounded', skeletonBg)} />
          </div>
          <div className={cn('h-3 w-32 rounded', skeletonBg)} />
          <div className={cn('h-4 w-full rounded', skeletonBg)} />
        </div>
      </div>
    </div>
  );
}

/**
 * ConversationList - List of marketplace conversations
 *
 * @param {Object} props
 * @param {Conversation[]} props.conversations - List of conversations
 * @param {string} [props.activeConversationId] - Currently active conversation ID
 * @param {Function} props.onSelectConversation - Called when conversation is selected
 * @param {boolean} [props.loading] - Loading state
 * @param {string} [props.error] - Error message
 * @param {boolean} [props.isDark] - Dark mode
 * @param {string} [props.className] - Additional CSS classes
 */
export default function ConversationList({
  conversations = [],
  activeConversationId,
  onSelectConversation,
  loading = false,
  error = null,
  isDark = false,
  className,
}) {
  const [searchQuery, setSearchQuery] = React.useState('');

  // Filter conversations by search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;

    const query = searchQuery.toLowerCase();
    return conversations.filter(conv =>
      conv.other_user?.nom?.toLowerCase().includes(query) ||
      conv.listing?.titre?.toLowerCase().includes(query) ||
      conv.last_message?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  // Theme classes
  const borderColor = isDark ? 'border-slate-700' : 'border-gray-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-200';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Search */}
      <div className={cn('p-3 border-b', borderColor)}>
        <div className="relative">
          <Search size={18} className={cn('absolute left-3 top-1/2 -translate-y-1/2', textMuted)} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className={cn(
              'w-full pl-10 pr-4 py-2 border rounded-lg text-sm',
              inputBg,
              'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500'
            )}
            aria-label="Rechercher une conversation"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto" role="list" aria-label="Liste des conversations">
        {loading ? (
          // Loading skeletons
          <>
            {[1, 2, 3, 4, 5].map(i => (
              <ConversationSkeleton key={i} isDark={isDark} />
            ))}
          </>
        ) : error ? (
          // Error state
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <AlertCircle size={32} className="text-red-500 mb-3" />
            <p className={cn('text-sm text-center', textMuted)}>
              Erreur de chargement
            </p>
            <p className="text-xs text-red-500 mt-1">{error}</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          // Empty state
          searchQuery ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Search size={32} className={cn('mb-3', textMuted)} />
              <p className={cn('text-sm text-center', textMuted)}>
                Aucun résultat pour "{searchQuery}"
              </p>
            </div>
          ) : (
            <EmptyState isDark={isDark} />
          )
        ) : (
          // Conversation cards
          <div className="p-2 space-y-1" role="listbox">
            {filteredConversations.map(conversation => (
              <ConversationCard
                key={conversation.id}
                conversation={conversation}
                isActive={activeConversationId === conversation.id}
                onClick={() => onSelectConversation(conversation)}
                isDark={isDark}
              />
            ))}
          </div>
        )}
      </div>

      {/* Total unread badge (mobile) */}
      {!loading && conversations.length > 0 && (
        <div className={cn('p-3 border-t text-center text-sm', borderColor, textMuted)}>
          {conversations.length} conversation{conversations.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

// Export Avatar for use in other components
export { Avatar };
