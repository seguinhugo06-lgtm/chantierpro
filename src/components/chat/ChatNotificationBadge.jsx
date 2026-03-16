/**
 * ChatNotificationBadge.jsx — Small badge showing total unread chat count
 *
 * Meant to be placed on the sidebar nav item for "Messagerie".
 * Uses a lightweight polling + realtime approach to stay updated.
 */

import React, { useState, useEffect, memo, useCallback } from 'react';
import supabase, { isDemo } from '../../supabaseClient';
import { getTotalUnreadCount } from '../../services/chatService';
import { subscribeToUnreadChanges } from '../../services/chatRealtimeService';

const ChatNotificationBadge = memo(function ChatNotificationBadge({ userId }) {
  const [unreadCount, setUnreadCount] = useState(0);

  // Initial fetch
  const fetchUnread = useCallback(async () => {
    try {
      const count = await getTotalUnreadCount(supabase);
      setUnreadCount(count);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchUnread();

    // Subscribe to changes
    const sub = subscribeToUnreadChanges(supabase, userId, (total) => {
      setUnreadCount(total);
    });

    // Also poll every 30s as fallback
    const interval = setInterval(fetchUnread, 30000);

    return () => {
      sub.unsubscribe();
      clearInterval(interval);
    };
  }, [userId, fetchUnread]);

  if (unreadCount <= 0) return null;

  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500 text-white font-bold min-w-[16px] text-center">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  );
});

export default ChatNotificationBadge;
