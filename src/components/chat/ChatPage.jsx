/**
 * ChatPage.jsx — Main messagerie page
 *
 * Full-screen layout: sidebar + message panel.
 * Responsive: sidebar becomes a drawer on mobile.
 * Handles all chat state + realtime subscriptions.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import {
  MessageCircle, Plus, Search, Users, Hash, Building2, X,
  ArrowLeft, Settings, UserPlus, Info, Loader2, Menu,
  MessageSquarePlus, Zap, ChevronUp, ChevronDown,
} from 'lucide-react';
import supabase, { isDemo } from '../../supabaseClient';
import { useOrg } from '../../context/OrgContext';
import {
  loadChannels,
  loadMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  toggleReaction,
  markChannelRead,
  createChannel,
  uploadChatFile,
  searchMessages,
  DEMO_USERS,
} from '../../services/chatService';
import {
  subscribeToChannel,
  subscribeToUnreadChanges,
} from '../../services/chatRealtimeService';
import ChatSidebar from './ChatSidebar';
import ChatMessageList from './ChatMessageList';
import ChatInput from './ChatInput';
import NewChannelModal from './NewChannelModal';

const ChatPage = memo(function ChatPage({
  isDark = false,
  couleur = '#f97316',
  showToast,
  user,
  equipe = [],
}) {
  const { orgId } = useOrg();
  const userId = user?.id;

  // ── State ─────────────────────────────────────────────────────────────────

  const [channels, setChannels] = useState([]);
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [showChannelSearch, setShowChannelSearch] = useState(false);
  const [channelSearchQuery, setChannelSearchQuery] = useState('');
  const [channelSearchResults, setChannelSearchResults] = useState([]);
  const [channelSearchIndex, setChannelSearchIndex] = useState(0);
  const [showChannelInfo, setShowChannelInfo] = useState(false);

  const subscriptionRef = useRef(null);
  const channelSearchInputRef = useRef(null);
  const unreadSubRef = useRef(null);
  const messageCursorRef = useRef(null);
  const typingTimeoutsRef = useRef({});

  // ── Active channel ────────────────────────────────────────────────────────

  const activeChannel = useMemo(() =>
    channels.find(c => c.id === activeChannelId),
    [channels, activeChannelId]
  );

  // ── Load channels ─────────────────────────────────────────────────────────

  const refreshChannels = useCallback(async () => {
    if (!userId) { setLoadingChannels(false); return; }
    try {
      const data = await loadChannels(supabase, { userId, orgId });
      setChannels(Array.isArray(data) ? data.filter(Boolean) : []);
    } catch (err) {
      console.warn('[ChatPage] Load channels error:', err?.message || err);
      setChannels([]);
    } finally {
      setLoadingChannels(false);
    }
  }, [userId, orgId]);

  useEffect(() => {
    refreshChannels();
  }, [refreshChannels]);

  // ── Load messages for active channel ──────────────────────────────────────

  const loadChannelMessages = useCallback(async (channelId) => {
    if (!channelId) return;
    setLoadingMessages(true);
    messageCursorRef.current = null;

    try {
      const result = await loadMessages(supabase, { channelId, limit: 30 });
      setMessages(result.messages);
      setHasMoreMessages(result.hasMore);
      messageCursorRef.current = result.nextCursor;

      // Mark as read
      await markChannelRead(supabase, { channelId, userId });
      setChannels(prev => prev.map(c =>
        c.id === channelId ? { ...c, unreadCount: 0 } : c
      ));
    } catch (err) {
      console.error('[ChatPage] Load messages error:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [userId]);

  // ── Load more messages (infinite scroll) ──────────────────────────────────

  const handleLoadMore = useCallback(async () => {
    if (!activeChannelId || !messageCursorRef.current || loadingMore) return;
    setLoadingMore(true);

    try {
      const result = await loadMessages(supabase, {
        channelId: activeChannelId,
        cursor: messageCursorRef.current,
        limit: 30,
      });
      setMessages(prev => [...result.messages, ...prev]);
      setHasMoreMessages(result.hasMore);
      messageCursorRef.current = result.nextCursor;
    } catch (err) {
      console.error('[ChatPage] Load more error:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [activeChannelId, loadingMore]);

  // ── Channel selection ─────────────────────────────────────────────────────

  const handleSelectChannel = useCallback((channelId) => {
    setActiveChannelId(channelId);
    setReplyTo(null);
    setEditingMessage(null);
    setSearchResults(null);
    setShowMobileSidebar(false);
    setShowChannelSearch(false);
    setChannelSearchQuery('');
    setChannelSearchResults([]);
    setShowChannelInfo(false);
    loadChannelMessages(channelId);
  }, [loadChannelMessages]);

  // ── Realtime subscriptions ────────────────────────────────────────────────

  useEffect(() => {
    if (!activeChannelId || isDemo) return;

    // Cleanup previous subscription
    subscriptionRef.current?.unsubscribe();

    const sub = subscribeToChannel(supabase, activeChannelId, {
      onNewMessage: (rawMsg) => {
        if (rawMsg.user_id === userId) return; // Already added locally
        const msg = {
          id: rawMsg.id,
          channelId: rawMsg.channel_id,
          userId: rawMsg.user_id,
          content: rawMsg.content,
          contentType: rawMsg.content_type,
          attachments: rawMsg.attachments || [],
          voiceDurationMs: rawMsg.voice_duration_ms,
          replyToId: rawMsg.reply_to_id,
          systemEvent: rawMsg.system_event,
          createdAt: rawMsg.created_at,
          reactions: [],
          userName: rawMsg.user_name || rawMsg.user_id,
        };
        setMessages(prev => [...prev, msg]);

        // Mark as read since we're looking at the channel
        markChannelRead(supabase, { channelId: activeChannelId, userId }).catch(() => {});
      },
      onMessageUpdated: (rawMsg) => {
        setMessages(prev => prev.map(m =>
          m.id === rawMsg.id
            ? { ...m, content: rawMsg.content, editedAt: rawMsg.edited_at }
            : m
        ));
      },
      onMessageDeleted: (messageId) => {
        setMessages(prev => prev.map(m =>
          m.id === messageId
            ? { ...m, deletedAt: new Date().toISOString(), content: null }
            : m
        ));
      },
      onReactionChanged: ({ messageId }) => {
        // Refetch reactions for this message (simplified)
        // In production, we'd refetch from DB; for now just trigger re-render
      },
      onTyping: ({ userId: typingUserId, userName, isTyping }) => {
        if (typingUserId === userId) return;
        if (isTyping) {
          setTypingUsers(prev => {
            if (prev.includes(userName)) return prev;
            return [...prev, userName];
          });
          // Clear after 3 seconds
          if (typingTimeoutsRef.current[typingUserId]) {
            clearTimeout(typingTimeoutsRef.current[typingUserId]);
          }
          typingTimeoutsRef.current[typingUserId] = setTimeout(() => {
            setTypingUsers(prev => prev.filter(n => n !== userName));
          }, 3000);
        } else {
          setTypingUsers(prev => prev.filter(n => n !== userName));
        }
      },
    });

    subscriptionRef.current = sub;

    return () => {
      sub.unsubscribe();
      // Clear typing timeouts
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      typingTimeoutsRef.current = {};
      setTypingUsers([]);
    };
  }, [activeChannelId, userId]);

  // Unread count subscription
  useEffect(() => {
    if (isDemo || !userId) return;

    unreadSubRef.current?.unsubscribe();

    const sub = subscribeToUnreadChanges(supabase, userId, () => {
      refreshChannels();
    });
    unreadSubRef.current = sub;

    return () => sub.unsubscribe();
  }, [userId, refreshChannels]);

  // ── Send message ──────────────────────────────────────────────────────────

  const handleSend = useCallback(async ({ content, contentType, attachments, voiceDurationMs, replyToId }) => {
    if (!activeChannelId || !userId) return;

    try {
      const msg = await sendMessage(supabase, {
        channelId: activeChannelId,
        userId,
        content,
        contentType,
        attachments,
        voiceDurationMs,
        replyToId,
      });

      if (!msg) {
        showToast?.('Message non envoyé — réessayez', 'error');
        return;
      }

      setMessages(prev => [...prev, msg]);

      // Update channel preview
      setChannels(prev => prev.map(c =>
        c.id === activeChannelId
          ? {
            ...c,
            lastMessageAt: msg.createdAt,
            lastMessagePreview: contentType === 'text' ? content?.slice(0, 100) : `[${contentType}]`,
          }
          : c
      ));
    } catch (err) {
      showToast?.(`Erreur d'envoi : ${err.message}`, 'error');
    }
  }, [activeChannelId, userId, showToast]);

  // ── Typing indicator ──────────────────────────────────────────────────────

  const handleTyping = useCallback((isTyping) => {
    if (!subscriptionRef.current) return;
    const userName = user?.user_metadata?.nom || user?.email || 'Utilisateur';
    subscriptionRef.current.sendTyping(userId, userName, isTyping);
  }, [userId, user]);

  // ── Reactions ─────────────────────────────────────────────────────────────

  const handleReact = useCallback(async (messageId, emoji) => {
    try {
      const updatedReactions = await toggleReaction(supabase, { messageId, userId, emoji });
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, reactions: updatedReactions } : m
      ));
    } catch (err) {
      console.error('[ChatPage] Reaction error:', err);
    }
  }, [userId]);

  // ── Edit ──────────────────────────────────────────────────────────────────

  const handleEdit = useCallback((message) => {
    setEditingMessage(message);
    // The edit UI is handled in ChatInput
  }, []);

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async (messageId) => {
    const confirmed = window.confirm('Supprimer ce message ?');
    if (!confirmed) return;

    try {
      await deleteMessage(supabase, { messageId, userId });
      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, deletedAt: new Date().toISOString(), content: null }
          : m
      ));
    } catch (err) {
      showToast?.('Erreur de suppression', 'error');
    }
  }, [userId, showToast]);

  // ── File upload ───────────────────────────────────────────────────────────

  const handleUploadFile = useCallback(async (file) => {
    return uploadChatFile(supabase, { file, channelId: activeChannelId, userId });
  }, [activeChannelId, userId]);

  // ── Reply ─────────────────────────────────────────────────────────────────

  const handleReply = useCallback((message) => {
    setReplyTo(message);
  }, []);

  // ── Create channel ────────────────────────────────────────────────────────

  const handleCreateChannel = useCallback(async ({ name, type, description, memberIds }) => {
    try {
      const channel = await createChannel(supabase, {
        userId,
        orgId,
        name,
        type,
        description,
        memberIds,
      });
      if (!channel) {
        showToast?.('La messagerie nécessite une configuration serveur. Contactez le support.', 'error');
        return;
      }
      await refreshChannels();
      handleSelectChannel(channel.id);
      setShowNewChannel(false);
      showToast?.(`Canal "${name}" créé`, 'success');
    } catch (err) {
      showToast?.(`Erreur : ${err.message}`, 'error');
    }
  }, [userId, orgId, refreshChannels, handleSelectChannel, showToast]);

  // ── Search ────────────────────────────────────────────────────────────────

  const handleSearch = useCallback(async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const results = await searchMessages(supabase, { query, userId, limit: 20 });
      setSearchResults(results);
    } catch (err) {
      console.error('[ChatPage] Search error:', err);
    }
  }, [userId]);

  // ── Channel search (local filter) ────────────────────────────────────────

  const handleChannelSearchToggle = useCallback(() => {
    setShowChannelSearch(prev => {
      if (!prev) {
        // Opening: reset
        setChannelSearchQuery('');
        setChannelSearchResults([]);
        setChannelSearchIndex(0);
        setTimeout(() => channelSearchInputRef.current?.focus(), 50);
      }
      return !prev;
    });
  }, []);

  const handleChannelSearchChange = useCallback((query) => {
    setChannelSearchQuery(query);
    if (!query.trim()) {
      setChannelSearchResults([]);
      setChannelSearchIndex(0);
      return;
    }
    const lower = query.toLowerCase();
    const results = messages
      .map((m, idx) => ({ ...m, _idx: idx }))
      .filter(m => m.content && !m.deletedAt && m.content.toLowerCase().includes(lower));
    setChannelSearchResults(results);
    setChannelSearchIndex(0);

    // Scroll to first result
    if (results.length > 0) {
      const el = document.getElementById(`msg-${results[0].id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [messages]);

  const handleChannelSearchNav = useCallback((direction) => {
    if (channelSearchResults.length === 0) return;
    const next = direction === 'next'
      ? (channelSearchIndex + 1) % channelSearchResults.length
      : (channelSearchIndex - 1 + channelSearchResults.length) % channelSearchResults.length;
    setChannelSearchIndex(next);
    const msg = channelSearchResults[next];
    if (msg) {
      const el = document.getElementById(`msg-${msg.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [channelSearchResults, channelSearchIndex]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────

  // Listen for "edit last own message" from ChatInput ArrowUp
  useEffect(() => {
    const handler = (e) => {
      if (e.detail) setEditingMessage(e.detail);
    };
    window.addEventListener('chat:edit-last-message', handler);
    return () => window.removeEventListener('chat:edit-last-message', handler);
  }, []);

  // Global Escape: close channel search, reply, edit
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (showChannelSearch) {
          setShowChannelSearch(false);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showChannelSearch]);

  // ── Theme ─────────────────────────────────────────────────────────────────

  const bgClass = isDark ? 'bg-slate-900' : 'bg-gray-50';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loadingChannels) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <Loader2 size={24} className="animate-spin" style={{ color: couleur }} />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`${bgClass} -m-3 sm:-m-4 lg:-m-6 -mb-14 lg:-mb-6 flex h-[calc(100vh-56px-56px)] lg:h-[calc(100vh-56px)] overflow-hidden rounded-none`}>
      {/* Mobile sidebar overlay */}
      {showMobileSidebar && (
        <div className="lg:hidden absolute inset-0 z-30">
          <div className="absolute inset-0 bg-black/30" onClick={() => {
            if (activeChannelId) setShowMobileSidebar(false);
          }} />
          <div className="relative w-80 h-full">
            <ChatSidebar
              channels={channels}
              activeChannelId={activeChannelId}
              onSelectChannel={handleSelectChannel}
              onCreateChannel={() => setShowNewChannel(true)}
              isDark={isDark}
              couleur={couleur}
              isMobile
              onClose={() => { if (activeChannelId) setShowMobileSidebar(false); }}
              currentUserId={userId}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block flex-shrink-0">
        <ChatSidebar
          channels={channels}
          activeChannelId={activeChannelId}
          onSelectChannel={handleSelectChannel}
          onCreateChannel={() => setShowNewChannel(true)}
          isDark={isDark}
          couleur={couleur}
          currentUserId={userId}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeChannel ? (
          <>
            {/* Channel header */}
            <div className={`flex items-center gap-3 px-4 py-3 border-b flex-shrink-0 ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
            }`}>
              {/* Mobile back button */}
              <button
                onClick={() => setShowMobileSidebar(true)}
                className={`lg:hidden p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
              >
                <ArrowLeft size={18} />
              </button>

              {/* Channel info */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                activeChannel.type === 'direct'
                  ? 'bg-gradient-to-br from-orange-400 to-orange-600'
                  : activeChannel.type === 'equipe'
                    ? 'bg-gradient-to-br from-blue-400 to-blue-600'
                    : activeChannel.type === 'chantier'
                      ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
                      : 'bg-gradient-to-br from-purple-400 to-purple-600'
              }`}>
                {(activeChannel.type === 'direct'
                  ? activeChannel.otherUser?.name
                  : activeChannel.name
                )?.charAt(0).toUpperCase() || '?'}
              </div>

              <button
                className="flex-1 min-w-0 text-left cursor-pointer"
                onClick={() => setShowChannelInfo(prev => !prev)}
                title="Infos du canal"
              >
                <h3 className={`text-sm font-semibold ${textPrimary} truncate`}>
                  {activeChannel.type === 'direct'
                    ? activeChannel.otherUser?.name || 'Direct'
                    : activeChannel.name
                  }
                </h3>
                {activeChannel.description && (
                  <p className={`text-[11px] ${textMuted} truncate`}>
                    {activeChannel.description}
                  </p>
                )}
              </button>

              {/* Channel actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleChannelSearchToggle}
                  className={`p-2 rounded-xl transition-colors ${
                    showChannelSearch
                      ? 'text-white'
                      : isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'
                  }`}
                  style={showChannelSearch ? { backgroundColor: couleur } : undefined}
                  title="Rechercher dans le canal"
                >
                  <Search size={16} />
                </button>
                <button
                  onClick={() => setShowChannelInfo(prev => !prev)}
                  className={`p-2 rounded-xl transition-colors ${
                    showChannelInfo
                      ? 'text-white'
                      : isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'
                  }`}
                  style={showChannelInfo ? { backgroundColor: couleur } : undefined}
                  title="Infos du canal"
                >
                  <Info size={16} />
                </button>
              </div>
            </div>

            {/* Channel search bar */}
            {showChannelSearch && (
              <div className={`flex items-center gap-2 px-4 py-2 border-b flex-shrink-0 ${cardBg}`}>
                <Search size={14} className={textMuted} />
                <input
                  ref={channelSearchInputRef}
                  type="text"
                  value={channelSearchQuery}
                  onChange={(e) => handleChannelSearchChange(e.target.value)}
                  placeholder="Rechercher dans les messages..."
                  className={`flex-1 text-sm border rounded-lg px-3 py-1.5 outline-none focus:ring-1 ${inputBg}`}
                  style={{ '--tw-ring-color': couleur }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleChannelSearchNav('next');
                    if (e.key === 'Escape') {
                      setShowChannelSearch(false);
                      setChannelSearchQuery('');
                      setChannelSearchResults([]);
                    }
                  }}
                />
                {channelSearchQuery && (
                  <span className={`text-xs whitespace-nowrap ${textMuted}`}>
                    {channelSearchResults.length > 0
                      ? `${channelSearchIndex + 1}/${channelSearchResults.length}`
                      : '0 résultat'}
                  </span>
                )}
                <button
                  onClick={() => handleChannelSearchNav('prev')}
                  disabled={channelSearchResults.length === 0}
                  className={`p-1 rounded transition-colors disabled:opacity-30 ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  onClick={() => handleChannelSearchNav('next')}
                  disabled={channelSearchResults.length === 0}
                  className={`p-1 rounded transition-colors disabled:opacity-30 ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  onClick={() => {
                    setShowChannelSearch(false);
                    setChannelSearchQuery('');
                    setChannelSearchResults([]);
                  }}
                  className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Messages */}
            {loadingMessages ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 size={20} className="animate-spin" style={{ color: couleur }} />
              </div>
            ) : (
              <ChatMessageList
                messages={messages}
                currentUserId={userId}
                hasMore={hasMoreMessages}
                isLoadingMore={loadingMore}
                onLoadMore={handleLoadMore}
                onReply={handleReply}
                onReact={handleReact}
                onEdit={handleEdit}
                onDelete={handleDelete}
                typingUsers={typingUsers}
                isDark={isDark}
                couleur={couleur}
                highlightTerm={showChannelSearch && channelSearchQuery ? channelSearchQuery : null}
                highlightMessageId={channelSearchResults[channelSearchIndex]?.id || null}
              />
            )}

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className={`flex items-center gap-2 px-4 py-1.5 ${isDark ? 'bg-slate-800/50' : 'bg-gray-50/80'}`}>
                <div className="flex gap-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${isDark ? 'bg-slate-500' : 'bg-gray-400'}`} style={{ animationDelay: '0ms' }} />
                  <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${isDark ? 'bg-slate-500' : 'bg-gray-400'}`} style={{ animationDelay: '150ms' }} />
                  <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${isDark ? 'bg-slate-500' : 'bg-gray-400'}`} style={{ animationDelay: '300ms' }} />
                </div>
                <span className={`text-[11px] ${textMuted}`}>
                  {typingUsers.length === 1
                    ? `${typingUsers[0]} est en train d'écrire...`
                    : `${typingUsers.length} personnes écrivent...`
                  }
                </span>
              </div>
            )}

            {/* Input */}
            <div className="relative z-10">
            <ChatInput
              onSend={handleSend}
              onTyping={handleTyping}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              editingMessage={editingMessage}
              onCancelEdit={() => setEditingMessage(null)}
              onUploadFile={handleUploadFile}
              messages={messages}
              currentUserId={userId}
              isDark={isDark}
              couleur={couleur}
            />
            </div>
          </>
        ) : (
          /* No channel selected — onboarding empty state */
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 ${
              isDark ? 'bg-slate-800' : 'bg-gray-100'
            }`}>
              <MessageCircle size={36} className={textMuted} />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${textPrimary}`}>Bienvenue dans la Messagerie</h3>
            <p className={`text-sm mb-8 ${textMuted} text-center max-w-sm`}>
              Communiquez avec votre équipe en 3 étapes simples
            </p>

            {/* 3-step onboarding */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-8 max-w-lg w-full">
              {[
                { icon: MessageSquarePlus, title: 'Créez un canal', desc: 'Par équipe, chantier ou sujet' },
                { icon: Users, title: 'Invitez vos collègues', desc: 'Ajoutez les membres concernés' },
                { icon: Zap, title: 'Échangez en direct', desc: 'Messages, fichiers et réactions' },
              ].map((step, i) => (
                <div key={i} className={`flex-1 flex flex-col items-center text-center p-4 rounded-xl ${
                  isDark ? 'bg-slate-800/60' : 'bg-gray-50'
                }`}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: `${couleur}15`, color: couleur }}>
                    <step.icon size={20} />
                  </div>
                  <p className={`text-sm font-semibold ${textPrimary}`}>{step.title}</p>
                  <p className={`text-xs mt-0.5 ${textMuted}`}>{step.desc}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowNewChannel(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2 hover:shadow-lg transition-all"
              style={{ background: couleur }}
            >
              <MessageSquarePlus size={18} />
              Créer mon premier canal
            </button>
          </div>
        )}
      </div>

      {/* Channel info panel */}
      {showChannelInfo && activeChannel && (
        <div className={`w-72 sm:w-80 flex-shrink-0 border-l flex flex-col overflow-y-auto ${cardBg}`}>
          {/* Panel header */}
          <div className={`flex items-center justify-between px-4 py-3 border-b ${
            isDark ? 'border-slate-700' : 'border-gray-200'
          }`}>
            <h3 className={`text-sm font-bold ${textPrimary}`}>Infos du canal</h3>
            <button
              onClick={() => setShowChannelInfo(false)}
              className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
            >
              <X size={16} />
            </button>
          </div>

          {/* Channel name + description */}
          <div className="px-4 py-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold mb-3 ${
              activeChannel.type === 'direct'
                ? 'bg-gradient-to-br from-orange-400 to-orange-600'
                : activeChannel.type === 'equipe'
                  ? 'bg-gradient-to-br from-blue-400 to-blue-600'
                  : activeChannel.type === 'chantier'
                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
                    : 'bg-gradient-to-br from-purple-400 to-purple-600'
            }`}>
              {(activeChannel.type === 'direct'
                ? activeChannel.otherUser?.name
                : activeChannel.name
              )?.charAt(0).toUpperCase() || '?'}
            </div>
            <h4 className={`text-base font-bold ${textPrimary}`}>
              {activeChannel.type === 'direct'
                ? activeChannel.otherUser?.name || 'Direct'
                : activeChannel.name}
            </h4>
            {activeChannel.description && (
              <p className={`text-sm mt-1 ${textMuted}`}>{activeChannel.description}</p>
            )}
            <p className={`text-xs mt-2 ${textMuted}`}>
              {activeChannel.type === 'direct' ? 'Message direct' :
               activeChannel.type === 'equipe' ? 'Canal d\'equipe' :
               activeChannel.type === 'chantier' ? 'Canal chantier' : 'Canal'}
            </p>
          </div>

          {/* Members */}
          <div className={`px-4 py-3 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <h5 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${textMuted}`}>
              Membres {activeChannel.members?.length ? `(${activeChannel.members.length})` : ''}
            </h5>
            <div className="space-y-2">
              {(activeChannel.members || []).map((member) => {
                const name = member.name || member.email || 'Utilisateur';
                const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <div key={member.id || member.userId} className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                      style={{ backgroundColor: couleur }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${textPrimary}`}>{name}</p>
                      {member.role && (
                        <p className={`text-[11px] ${textMuted}`}>{member.role}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {(!activeChannel.members || activeChannel.members.length === 0) && (
                <p className={`text-sm ${textMuted}`}>Aucun membre</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New channel modal */}
      {showNewChannel && (
        <NewChannelModal
          onSubmit={handleCreateChannel}
          onClose={() => setShowNewChannel(false)}
          isDark={isDark}
          couleur={couleur}
          equipe={equipe}
          demoUsers={isDemo ? DEMO_USERS : null}
        />
      )}
    </div>
  );
});

export default ChatPage;
