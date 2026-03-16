/**
 * chatRealtimeService.js — Supabase Realtime wrapper for chat
 *
 * Handles:
 * - postgres_changes for new messages, reactions, member changes
 * - broadcast for typing indicators
 * - Cleanup on unmount
 */

import { isDemo } from '../supabaseClient';

/**
 * Subscribe to a channel's real-time events
 *
 * @param {Object} supabase - Supabase client
 * @param {string} channelId - The chat channel UUID
 * @param {Object} handlers - Callback handlers
 * @param {Function} handlers.onNewMessage - (message) => void
 * @param {Function} handlers.onMessageUpdated - (message) => void
 * @param {Function} handlers.onMessageDeleted - (messageId) => void
 * @param {Function} handlers.onReactionChanged - ({ messageId, reactions }) => void
 * @param {Function} handlers.onTyping - ({ userId, userName, isTyping }) => void
 * @param {Function} handlers.onMemberChanged - (member) => void
 * @returns {{ unsubscribe: Function, sendTyping: Function }}
 */
export function subscribeToChannel(supabase, channelId, handlers = {}) {
  if (isDemo || !supabase) {
    // In demo mode, return a no-op subscription
    return {
      unsubscribe: () => {},
      sendTyping: () => {},
    };
  }

  const realtimeChannelName = `chat:${channelId}`;

  const channel = supabase
    .channel(realtimeChannelName)
    // Listen for new messages
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: `channel_id=eq.${channelId}`,
    }, (payload) => {
      handlers.onNewMessage?.(payload.new);
    })
    // Listen for message updates (edits, deletes)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'chat_messages',
      filter: `channel_id=eq.${channelId}`,
    }, (payload) => {
      if (payload.new.deleted_at) {
        handlers.onMessageDeleted?.(payload.new.id);
      } else {
        handlers.onMessageUpdated?.(payload.new);
      }
    })
    // Listen for reaction changes
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'chat_reactions',
    }, (payload) => {
      const messageId = payload.new?.message_id || payload.old?.message_id;
      if (messageId) {
        handlers.onReactionChanged?.({ messageId });
      }
    })
    // Listen for member changes
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'chat_members',
      filter: `channel_id=eq.${channelId}`,
    }, (payload) => {
      handlers.onMemberChanged?.(payload.new);
    })
    // Typing indicators via broadcast
    .on('broadcast', { event: 'typing' }, (payload) => {
      handlers.onTyping?.(payload.payload);
    })
    .subscribe();

  // Function to send typing indicator
  const sendTyping = (userId, userName, isTyping = true) => {
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId, userName, isTyping },
    });
  };

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
    sendTyping,
  };
}

/**
 * Subscribe to unread count changes across all channels
 *
 * @param {Object} supabase - Supabase client
 * @param {string} userId - Current user ID
 * @param {Function} onUnreadChange - (totalUnread) => void
 * @returns {{ unsubscribe: Function }}
 */
export function subscribeToUnreadChanges(supabase, userId, onUnreadChange) {
  if (isDemo || !supabase) {
    return { unsubscribe: () => {} };
  }

  const channel = supabase
    .channel(`chat:unread:${userId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'chat_members',
      filter: `user_id=eq.${userId}`,
    }, async () => {
      // Refetch total unread count
      const { data } = await supabase.rpc('get_total_unread_count');
      onUnreadChange?.(data || 0);
    })
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

/**
 * Subscribe to new channel creation (for sidebar updates)
 */
export function subscribeToChannelUpdates(supabase, userId, onChannelUpdate) {
  if (isDemo || !supabase) {
    return { unsubscribe: () => {} };
  }

  const channel = supabase
    .channel(`chat:channels:${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'chat_channels',
    }, (payload) => {
      onChannelUpdate?.(payload.eventType, payload.new || payload.old);
    })
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}
