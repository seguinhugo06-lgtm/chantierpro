/**
 * ChatMessageList.jsx — Scrollable message list with infinite scroll
 *
 * Features:
 * - Auto-scroll to bottom on new messages
 * - "Load more" on scroll to top (cursor-based)
 * - Date separators
 * - Typing indicator
 * - Message grouping (same sender, close timestamps)
 */

import React, { useRef, useEffect, useCallback, useState, memo } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';
import ChatMessageBubble from './ChatMessageBubble';

const ChatMessageList = memo(function ChatMessageList({
  messages = [],
  currentUserId,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onReply,
  onReact,
  onEdit,
  onDelete,
  typingUsers = [],
  isDark = false,
  couleur = '#f97316',
  highlightTerm = null,
  highlightMessageId = null,
}) {
  const containerRef = useRef(null);
  const bottomRef = useRef(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const isAtBottomRef = useRef(true);
  const prevMessageCountRef = useRef(0);

  // Check if scrolled to bottom
  const checkIsAtBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return true;
    const threshold = 80;
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  // Auto-scroll on new messages (only if already at bottom)
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current && isAtBottomRef.current) {
      scrollToBottom(messages.length - prevMessageCountRef.current <= 2);
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length, scrollToBottom]);

  // Initial scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll handler
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    isAtBottomRef.current = checkIsAtBottom();
    setShowScrollDown(!isAtBottomRef.current && messages.length > 5);

    // Load more when scrolled to top
    if (el.scrollTop < 50 && hasMore && !isLoadingMore) {
      onLoadMore?.();
    }
  }, [checkIsAtBottom, hasMore, isLoadingMore, onLoadMore, messages.length]);

  // ── Message grouping ──────────────────────────────────────────────────────

  const groupedMessages = React.useMemo(() => {
    const groups = [];
    let lastDate = null;

    messages.filter(Boolean).forEach((msg, i) => {
      if (!msg || !msg.createdAt) return;
      const msgDate = new Date(msg.createdAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const isToday = msgDate.toDateString() === today.toDateString();
      const isYesterday = msgDate.toDateString() === yesterday.toDateString();
      const dateStr = isToday
        ? "Aujourd'hui"
        : isYesterday
          ? 'Hier'
          : msgDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

      // Add date separator
      if (dateStr !== lastDate) {
        groups.push({ type: 'date', date: dateStr, key: `date-${dateStr}` });
        lastDate = dateStr;
      }

      // Check if same sender + within 3 minutes of previous message
      const prev = i > 0 ? messages[i - 1] : null;
      const isSameGroup = prev
        && prev.userId === msg.userId
        && prev.contentType !== 'system'
        && msg.contentType !== 'system'
        && (new Date(msg.createdAt) - new Date(prev.createdAt)) < 180000; // 3 min

      groups.push({
        type: 'message',
        message: { ...msg, _currentUserId: currentUserId },
        showAvatar: !isSameGroup,
        showName: !isSameGroup,
        key: msg.id,
      });
    });

    return groups;
  }, [messages, currentUserId]);

  // ── Render ────────────────────────────────────────────────────────────────

  const bgClass = isDark ? 'bg-slate-900' : 'bg-gray-50';

  return (
    <div className={`flex-1 relative overflow-hidden ${bgClass}`}>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-2 py-3 scroll-smooth"
      >
        {/* Loading more indicator */}
        {isLoadingMore && (
          <div className="flex justify-center py-3">
            <Loader2 size={18} className="animate-spin" style={{ color: couleur }} />
          </div>
        )}

        {/* Empty state */}
        {messages.length === 0 && !isLoadingMore && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 ${
              isDark ? 'bg-slate-800' : 'bg-gray-100'
            }`}>
              <span className="text-2xl">💬</span>
            </div>
            <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Aucun message
            </p>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Envoyez le premier message !
            </p>
          </div>
        )}

        {/* Messages */}
        {groupedMessages.map((item) => {
          if (item.type === 'date') {
            return (
              <div key={item.key} className="flex justify-center my-3">
                <span className={`text-[10px] px-3 py-1 rounded-full font-medium ${
                  isDark ? 'bg-slate-800 text-slate-500' : 'bg-gray-200/70 text-gray-500'
                }`}>
                  {item.date}
                </span>
              </div>
            );
          }

          return (
            <div key={item.key} id={`msg-${item.message.id}`}>
              <ChatMessageBubble
                message={item.message}
                isOwn={item.message.userId === currentUserId}
                showAvatar={item.showAvatar}
                showName={item.showName}
                onReply={onReply}
                onReact={onReact}
                onEdit={onEdit}
                onDelete={onDelete}
                isDark={isDark}
                couleur={couleur}
                highlightTerm={highlightTerm}
                isHighlighted={item.message.id === highlightMessageId}
              />
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollDown && (
        <button
          onClick={() => scrollToBottom(true)}
          className={`absolute bottom-4 right-4 w-9 h-9 rounded-full shadow-lg flex items-center justify-center transition-all ${
            isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-white text-gray-600 hover:bg-gray-50'
          } border ${isDark ? 'border-slate-600' : 'border-gray-200'}`}
        >
          <ArrowDown size={16} />
        </button>
      )}
    </div>
  );
});

export default ChatMessageList;
