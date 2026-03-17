/**
 * ChatPage.jsx — Main messagerie page
 *
 * Full-screen layout: sidebar + message panel.
 * Responsive: sidebar becomes a drawer on mobile.
 * Handles all chat state + realtime subscriptions.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import {
  MessageCircle, MessageSquarePlus, Plus, Search, Users, Hash, Building2, X,
  ArrowLeft, Settings, UserPlus, Info, Loader2, Menu, Zap, ChevronRight,
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

  const subscriptionRef = useRef(null);
  const unreadSubRef = useRef(null);
  const messageCursorRef = useRef(null);
  const typingTimeoutsRef = useRef({});

  // ── Active channel ────────────────────────────────────────────────────────

  const activeChannel = useMemo(() =>
    (channels || []).find(c => c.id === activeChannelId),
    [channels, activeChannelId]
  );

  // ── Load channels ─────────────────────────────────────────────────────────

  const refreshChannels = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await loadChannels(supabase, { userId, orgId });
      setChannels(data || []);
    } catch (err) {
      console.error('[ChatPage] Load channels error:', err);
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

  // ── Theme ─────────────────────────────────────────────────────────────────

  const bgClass = isDark ? 'bg-slate-900' : 'bg-gray-50';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-gray-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';

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
    <div className={`${bgClass} -m-3 sm:-m-4 lg:-m-6 flex h-[calc(100vh-56px)] lg:h-[calc(100vh-0px)] overflow-hidden rounded-none`}>
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

              <div className="flex-1 min-w-0">
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
              </div>

              {/* Channel actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleSearch('')}
                  className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
                  title="Rechercher"
                >
                  <Search size={16} />
                </button>
              </div>
            </div>

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
              />
            )}

            {/* Input */}
            <ChatInput
              onSend={handleSend}
              onTyping={handleTyping}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              onUploadFile={handleUploadFile}
              isDark={isDark}
              couleur={couleur}
            />
          </>
        ) : (
          /* No channel selected */
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6`} style={{ background: `${couleur}15` }}>
              <MessageCircle size={36} style={{ color: couleur }} />
            </div>
            <h3 className={`text-xl font-bold ${textPrimary}`}>Messagerie d'équipe</h3>
            <p className={`text-sm mt-2 ${textMuted} text-center max-w-sm`}>
              Créez des canaux par chantier ou par équipe pour centraliser vos échanges en temps réel.
            </p>
            {/* 3-step onboarding */}
            <div className="flex flex-col sm:flex-row items-center gap-4 mt-6 mb-6">
              {[
                { icon: MessageSquarePlus, label: 'Créez un canal' },
                { icon: Users, label: 'Invitez votre équipe' },
                { icon: Zap, label: 'Échangez en direct' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  {i > 0 && <ChevronRight size={14} className={`${textMuted} hidden sm:block`} />}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <step.icon size={16} style={{ color: couleur }} />
                    <span className={`text-xs font-medium ${textSecondary}`}>{step.label}</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowNewChannel(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2 hover:opacity-90 transition-opacity active:scale-95"
              style={{ background: couleur }}
            >
              <Plus size={16} />
              Créer mon premier canal
            </button>
          </div>
        )}
      </div>

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
