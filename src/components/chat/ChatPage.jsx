/**
 * ChatPage.jsx — Main messagerie page
 *
 * Full-screen layout: sidebar + message panel + thread panel.
 * Responsive: sidebar becomes a drawer on mobile.
 * Handles all chat state + realtime subscriptions.
 * Pro features: threads, @mentions, pinned messages, /templates.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import {
  MessageCircle, Plus, Search, Users, Hash, Building2, X,
  ArrowLeft, Settings, UserPlus, Info, Loader2, Menu,
  MessageSquarePlus, Zap, MessageSquare,
} from 'lucide-react';
import supabase, { isDemo } from '../../supabaseClient';
import { useOrg } from '../../context/OrgContext';
import { useConfirm } from '../../context/AppContext';
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
  loadChannelMembers,
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

// ── Thread Panel sub-component ────────────────────────────────────────────────

const ThreadPanel = memo(function ThreadPanel({
  parentMessage,
  threadMessages,
  currentUserId,
  onSendReply,
  onClose,
  onReact,
  isDark,
  couleur,
}) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [threadMessages.length]);

  const handleSend = useCallback(async ({ content, contentType, attachments }) => {
    await onSendReply?.({
      content,
      contentType,
      attachments,
      replyToId: parentMessage.id,
    });
  }, [onSendReply, parentMessage?.id]);

  if (!parentMessage) return null;

  return (
    <div className={`w-80 flex-shrink-0 flex flex-col border-l h-full ${cardBg}`}>
      {/* Header */}
      <div className={`flex items-center gap-2 px-3 py-3 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <MessageSquare size={16} style={{ color: couleur }} />
        <h4 className={`text-sm font-semibold flex-1 ${textPrimary}`}>Thread</h4>
        <button
          onClick={onClose}
          aria-label="Fermer"
          className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
        >
          <X size={16} />
        </button>
      </div>

      {/* Parent message */}
      <div className={`px-3 py-2 border-b ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-[11px] font-bold">
            {(parentMessage.userName || '?').charAt(0).toUpperCase()}
          </div>
          <span className={`text-xs font-semibold ${textPrimary}`}>{parentMessage.userName}</span>
          <span className={`text-[11px] ${textMuted}`}>
            {parentMessage.createdAt && new Date(parentMessage.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'} whitespace-pre-wrap`}>
          {parentMessage.content}
        </p>
      </div>

      {/* Thread replies */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {threadMessages.length === 0 && (
          <p className={`text-xs text-center mt-4 ${textMuted}`}>Aucune réponse pour le moment</p>
        )}
        {threadMessages.map(msg => (
          <div key={msg.id} className="mb-3">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-[8px] font-bold">
                {(msg.userName || '?').charAt(0).toUpperCase()}
              </div>
              <span className={`text-[11px] font-semibold ${textPrimary}`}>{msg.userName}</span>
              <span className={`text-[11px] ${textMuted}`}>
                {msg.createdAt && new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className={`ml-7 px-2.5 py-1.5 rounded-xl text-xs ${
              msg.userId === currentUserId
                ? 'text-white rounded-br-sm'
                : isDark ? 'bg-slate-700 text-slate-200 rounded-bl-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'
            }`}
              style={msg.userId === currentUserId ? { background: couleur } : {}}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Thread input */}
      <div className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <ChatInput
          onSend={handleSend}
          isDark={isDark}
          couleur={couleur}
          disabled={false}
        />
      </div>
    </div>
  );
});

// ── Main ChatPage ─────────────────────────────────────────────────────────────

const ChatPage = memo(function ChatPage({
  isDark = false,
  couleur = '#f97316',
  showToast,
  user,
  equipe = [],
}) {
  const { orgId } = useOrg();
  const { confirm } = useConfirm();
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

  // Thread state
  const [threadMessage, setThreadMessage] = useState(null);

  // Channel members (for @mentions)
  const [channelMembers, setChannelMembers] = useState([]);

  const subscriptionRef = useRef(null);
  const unreadSubRef = useRef(null);
  const messageCursorRef = useRef(null);
  const typingTimeoutsRef = useRef({});

  // ── Active channel ────────────────────────────────────────────────────────

  const activeChannel = useMemo(() =>
    channels.find(c => c.id === activeChannelId),
    [channels, activeChannelId]
  );

  // Enrich messages with userName from channelMembers + resolve replyTo references
  const enrichedMessages = useMemo(() => {
    const memberMap = channelMembers.length > 0
      ? new Map(channelMembers.map(m => [m.userId, m]))
      : new Map();
    // First pass: enrich userName
    const enriched = messages.map(msg => {
      const enrichedMsg = { ...msg };
      if (!enrichedMsg.userName && memberMap.size > 0) {
        const member = memberMap.get(msg.userId);
        if (member) enrichedMsg.userName = member.userName || member.userEmail;
      }
      return enrichedMsg;
    });
    // Second pass: resolve replyTo from local messages
    return enriched.map(msg => {
      if (msg.replyToId && !msg.replyTo) {
        const parent = enriched.find(m => m.id === msg.replyToId);
        if (parent) return { ...msg, replyTo: { userName: parent.userName, content: parent.content } };
      }
      return msg;
    });
  }, [messages, channelMembers]);

  // Thread messages (replies to the thread parent)
  const threadMessages = useMemo(() => {
    if (!threadMessage) return [];
    return enrichedMessages.filter(m => m.replyToId === threadMessage.id);
  }, [messages, threadMessage]);

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

  // ── Load channel members (for @mentions) ──────────────────────────────────

  const loadMembers = useCallback(async (channelId) => {
    if (!channelId) return;
    try {
      const members = await loadChannelMembers(supabase, { channelId });
      setChannelMembers(members);
    } catch (err) {
      console.warn('[ChatPage] Load members error:', err?.message || err);
      setChannelMembers([]);
    }
  }, []);

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
    setThreadMessage(null);
    setShowMobileSidebar(false);
    loadChannelMessages(channelId);
    loadMembers(channelId);
  }, [loadChannelMessages, loadMembers]);

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
      },
      onTyping: ({ userId: typingUserId, userName, isTyping }) => {
        if (typingUserId === userId) return;
        if (isTyping) {
          setTypingUsers(prev => {
            if (prev.includes(userName)) return prev;
            return [...prev, userName];
          });
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
      // Extract user name — handle nested JSON {nom, prenom} or simple string
      const meta = user?.user_metadata;
      const nomField = meta?.nom;
      const userName = (typeof nomField === 'object' && nomField)
        ? `${nomField.prenom || ''} ${nomField.nom || ''}`.trim()
        : nomField || meta?.full_name || user?.email?.split('@')[0] || 'Utilisateur';
      const userEmail = user?.email || null;
      const msg = await sendMessage(supabase, {
        channelId: activeChannelId,
        userId,
        content,
        contentType,
        attachments,
        voiceDurationMs,
        replyToId,
        userName,
        userEmail,
      });

      if (!msg) {
        showToast?.('Message non envoyé — réessayez', 'error');
        return;
      }

      // Enrich message with user info + reply context for immediate display
      msg.userName = msg.userName || userName;
      msg.userEmail = msg.userEmail || userEmail;
      if (msg.replyToId && !msg.replyTo) {
        const parent = messages.find(m => m.id === msg.replyToId);
        if (parent) msg.replyTo = { userName: parent.userName, content: parent.content };
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
  }, []);

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async (messageId) => {
    const confirmed = await confirm({
      title: 'Supprimer ce message ?',
      message: 'Ce message sera définitivement supprimé pour tous les participants.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      danger: true,
    });
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
  }, [userId, showToast, confirm]);

  // ── Pin / Unpin ───────────────────────────────────────────────────────────

  const handlePin = useCallback((message) => {
    setMessages(prev => prev.map(m =>
      m.id === message.id ? { ...m, pinned: !m.pinned } : m
    ));
    showToast?.(message.pinned ? 'Message désépinglé' : 'Message épinglé', 'success');
  }, [showToast]);

  // ── Thread ────────────────────────────────────────────────────────────────

  const handleOpenThread = useCallback((message) => {
    setThreadMessage(message);
  }, []);

  const handleCloseThread = useCallback(() => {
    setThreadMessage(null);
  }, []);

  // ── Channel management ────────────────────────────────────────────────────

  const handleMuteChannel = useCallback(async (channelId) => {
    try {
      const ch = channels.find(c => c.id === channelId);
      const newMuted = !(ch?.muted);
      if (!isDemo) {
        await supabase.from('chat_members')
          .update({ muted: newMuted })
          .eq('channel_id', channelId)
          .eq('user_id', userId);
      }
      setChannels(prev => prev.map(c => c.id === channelId ? { ...c, muted: newMuted } : c));
      showToast?.(newMuted ? 'Canal muté' : 'Notifications réactivées', 'success');
    } catch (err) {
      showToast?.('Erreur', 'error');
    }
  }, [channels, userId, showToast]);

  const handleArchiveChannel = useCallback(async (channelId) => {
    try {
      if (!isDemo) {
        await supabase.from('chat_channels')
          .update({ is_archived: true })
          .eq('id', channelId);
      }
      setChannels(prev => prev.filter(c => c.id !== channelId));
      if (activeChannelId === channelId) setActiveChannelId(null);
      showToast?.('Canal archivé', 'success');
    } catch (err) {
      showToast?.('Erreur', 'error');
    }
  }, [activeChannelId, showToast]);

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
      const cMeta = user?.user_metadata;
      const cNom = cMeta?.nom;
      const creatorName = (typeof cNom === 'object' && cNom)
        ? `${cNom.prenom || ''} ${cNom.nom || ''}`.trim()
        : cNom || cMeta?.full_name || user?.email?.split('@')[0] || 'Utilisateur';
      const channel = await createChannel(supabase, {
        userId,
        orgId,
        name,
        type,
        description,
        memberIds,
        userName: creatorName,
        userEmail: user?.email,
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

  // ── Theme ─────────────────────────────────────────────────────────────────

  const bgClass = isDark ? 'bg-slate-900' : 'bg-gray-50';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
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
    <div className={`${bgClass} -m-3 sm:-m-4 lg:-m-6 -mb-14 lg:-mb-6 flex h-[calc(100vh-56px-56px)] lg:h-[calc(100vh-56px)] overflow-hidden rounded-none`}>
      {/* Mobile sidebar overlay */}
      {showMobileSidebar && (
        <div className="lg:hidden fixed inset-0 z-30">
          <div className="absolute inset-0 bg-black/30" onClick={() => {
            if (activeChannelId) setShowMobileSidebar(false);
          }} />
          <div className="relative w-80 h-full ml-auto sm:ml-0">
            <ChatSidebar
              channels={channels}
              activeChannelId={activeChannelId}
              onSelectChannel={handleSelectChannel}
              onCreateChannel={() => setShowNewChannel(true)}
              onMuteChannel={handleMuteChannel}
              onArchiveChannel={handleArchiveChannel}
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
          onMuteChannel={handleMuteChannel}
          onArchiveChannel={handleArchiveChannel}
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
                aria-label="Retour"
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
                  aria-label="Rechercher"
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
                messages={enrichedMessages}
                currentUserId={userId}
                hasMore={hasMoreMessages}
                isLoadingMore={loadingMore}
                onLoadMore={handleLoadMore}
                onReply={handleReply}
                onReact={handleReact}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPin={handlePin}
                onOpenThread={handleOpenThread}
                typingUsers={typingUsers}
                isDark={isDark}
                couleur={couleur}
              />
            )}

            {/* Input */}
            <div className="relative z-10">
            <ChatInput
              onSend={handleSend}
              onTyping={handleTyping}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              onUploadFile={handleUploadFile}
              isDark={isDark}
              couleur={couleur}
              channelMembers={channelMembers}
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

      {/* Thread panel (slide-in from right) */}
      {threadMessage && activeChannel && (
        <ThreadPanel
          parentMessage={threadMessage}
          threadMessages={threadMessages}
          currentUserId={userId}
          onSendReply={handleSend}
          onClose={handleCloseThread}
          onReact={handleReact}
          isDark={isDark}
          couleur={couleur}
        />
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
