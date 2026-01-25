/**
 * useMarketplaceMessages Hook
 * Real-time messaging for marketplace listings
 *
 * @module useMarketplaceMessages
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import supabase, { isDemo } from '../supabaseClient';

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} listing_id
 * @property {string} sender_id
 * @property {string} receiver_id
 * @property {string} message
 * @property {string} created_at
 * @property {boolean} read
 * @property {Object} [sender] - Sender profile
 * @property {Object} [receiver] - Receiver profile
 * @property {string[]} [attachments] - Attachment URLs
 */

/**
 * @typedef {Object} Conversation
 * @property {string} id
 * @property {string} listing_id
 * @property {Object} listing - Listing details
 * @property {Object} other_user - Other participant
 * @property {string} last_message
 * @property {string} last_message_at
 * @property {number} unread_count
 */

// Demo messages for development
const DEMO_MESSAGES = [
  {
    id: 'msg-1',
    listing_id: '1',
    sender_id: 'demo-seller',
    receiver_id: 'demo-user-id',
    message: 'Bonjour, est-ce que les parpaings sont toujours disponibles ?',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    sender: { id: 'demo-seller', nom: 'Jean Dupont', avatar: null },
  },
  {
    id: 'msg-2',
    listing_id: '1',
    sender_id: 'demo-user-id',
    receiver_id: 'demo-seller',
    message: 'Oui, ils sont disponibles. Vous pouvez passer les chercher quand vous voulez.',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
    read: true,
    sender: { id: 'demo-user-id', nom: 'Vous', avatar: null },
  },
  {
    id: 'msg-3',
    listing_id: '1',
    sender_id: 'demo-seller',
    receiver_id: 'demo-user-id',
    message: 'Parfait ! Je peux passer demain matin vers 9h, ça vous convient ?',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    sender: { id: 'demo-seller', nom: 'Jean Dupont', avatar: null },
  },
  {
    id: 'msg-4',
    listing_id: '1',
    sender_id: 'demo-user-id',
    receiver_id: 'demo-seller',
    message: 'Oui, c\'est parfait. Je vous envoie l\'adresse exacte.',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(),
    read: true,
    sender: { id: 'demo-user-id', nom: 'Vous', avatar: null },
  },
];

const DEMO_CONVERSATIONS = [
  {
    id: 'conv-1',
    listing_id: '1',
    listing: { id: '1', titre: '50 Parpaings 20x20x50', photos: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100'] },
    other_user: { id: 'demo-seller', nom: 'Jean Dupont', avatar: null },
    last_message: 'Oui, c\'est parfait. Je vous envoie l\'adresse exacte.',
    last_message_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(),
    unread_count: 0,
  },
  {
    id: 'conv-2',
    listing_id: '2',
    listing: { id: '2', titre: '100 Tuiles terre cuite', photos: ['https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=100'] },
    other_user: { id: 'demo-seller-2', nom: 'Pierre Martin', avatar: null },
    last_message: 'Bonjour, quel est votre meilleur prix pour le lot complet ?',
    last_message_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    unread_count: 1,
  },
  {
    id: 'conv-3',
    listing_id: '3',
    listing: { id: '3', titre: '25 Sacs de ciment', photos: ['https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=100'] },
    other_user: { id: 'demo-seller-3', nom: 'Sophie Bernard', avatar: null },
    last_message: 'Je passe chercher demain, OK ?',
    last_message_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    unread_count: 0,
  },
];

/**
 * Play notification sound for new messages
 */
function playNotificationSound() {
  try {
    // Create a simple beep using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    // Audio not available
  }
}

/**
 * Filter sensitive information from messages (phone numbers, emails)
 * @param {string} text - Message text
 * @returns {string} Filtered text
 */
export function filterSensitiveInfo(text) {
  if (!text) return text;

  // Filter phone numbers (French formats)
  let filtered = text.replace(/(\+33|0033|0)\s*[1-9](\s*\d{2}){4}/g, '[numéro masqué]');
  filtered = filtered.replace(/\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/g, '[numéro masqué]');

  // Filter email addresses
  filtered = filtered.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email masqué]');

  return filtered;
}

/**
 * Check if message contains sensitive info
 * @param {string} text - Message text
 * @returns {boolean}
 */
export function containsSensitiveInfo(text) {
  if (!text) return false;

  // Check for phone numbers
  const phoneRegex = /(\+33|0033|0)\s*[1-9](\s*\d{2}){4}|\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/;
  if (phoneRegex.test(text)) return true;

  // Check for email
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  if (emailRegex.test(text)) return true;

  return false;
}

/**
 * Format relative time for messages
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted relative time
 */
export function formatMessageTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins}min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays}j`;

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/**
 * Format time for message bubbles (HH:mm)
 * @param {string} dateStr - ISO date string
 * @returns {string}
 */
export function formatBubbleTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Hook for fetching and managing messages for a specific conversation
 *
 * @param {string} listingId - Listing ID
 * @param {string} otherUserId - Other participant's user ID
 * @param {string} currentUserId - Current user's ID
 * @returns {Object} Messages state and functions
 */
export function useMarketplaceMessages(listingId, otherUserId, currentUserId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const subscriptionRef = useRef(null);

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    if (!listingId) return;

    setLoading(true);
    setError(null);

    try {
      if (isDemo || !supabase) {
        // Demo mode
        await new Promise(resolve => setTimeout(resolve, 300));
        const filtered = DEMO_MESSAGES.filter(m => m.listing_id === listingId);
        setMessages(filtered);
      } else {
        const { data, error: fetchError } = await supabase
          .from('marketplace_messages')
          .select(`
            *,
            sender:sender_id(id, nom, avatar),
            receiver:receiver_id(id, nom, avatar)
          `)
          .eq('listing_id', listingId)
          .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;
        setMessages(data || []);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [listingId, otherUserId, currentUserId]);

  // Mark messages as read
  const markAsRead = useCallback(async (messageIds) => {
    if (isDemo || !supabase || !messageIds?.length) return;

    try {
      await supabase
        .from('marketplace_messages')
        .update({ read: true })
        .in('id', messageIds)
        .eq('receiver_id', currentUserId);
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }, [currentUserId]);

  // Send a new message
  const sendMessage = useCallback(async (text, attachments = []) => {
    if (!text?.trim() && !attachments.length) return { success: false, error: 'Message vide' };

    // Check for sensitive info
    if (containsSensitiveInfo(text)) {
      return {
        success: false,
        error: 'Pour votre sécurité, les numéros de téléphone et emails ne sont pas autorisés dans les messages.',
        warning: true,
      };
    }

    setSending(true);

    try {
      if (isDemo || !supabase) {
        // Demo mode - simulate sending
        await new Promise(resolve => setTimeout(resolve, 500));

        const newMessage = {
          id: `msg-${Date.now()}`,
          listing_id: listingId,
          sender_id: currentUserId,
          receiver_id: otherUserId,
          message: text,
          created_at: new Date().toISOString(),
          read: false,
          attachments,
          sender: { id: currentUserId, nom: 'Vous', avatar: null },
        };

        setMessages(prev => [...prev, newMessage]);
        return { success: true, message: newMessage };
      }

      const { data, error: sendError } = await supabase
        .from('marketplace_messages')
        .insert({
          listing_id: listingId,
          sender_id: currentUserId,
          receiver_id: otherUserId,
          message: text,
          attachments,
        })
        .select(`
          *,
          sender:sender_id(id, nom, avatar),
          receiver:receiver_id(id, nom, avatar)
        `)
        .single();

      if (sendError) throw sendError;

      // Note: Real-time subscription will add the message, but we return it for optimistic updates
      return { success: true, message: data };
    } catch (err) {
      console.error('Error sending message:', err);
      return { success: false, error: err.message };
    } finally {
      setSending(false);
    }
  }, [listingId, otherUserId, currentUserId]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!listingId || isDemo || !supabase) {
      fetchMessages();
      return;
    }

    fetchMessages();

    // Set up real-time subscription
    const channel = supabase
      .channel(`marketplace_messages:${listingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'marketplace_messages',
          filter: `listing_id=eq.${listingId}`,
        },
        async (payload) => {
          // Fetch full message with relations
          const { data: fullMessage } = await supabase
            .from('marketplace_messages')
            .select(`
              *,
              sender:sender_id(id, nom, avatar),
              receiver:receiver_id(id, nom, avatar)
            `)
            .eq('id', payload.new.id)
            .single();

          if (fullMessage) {
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === fullMessage.id)) return prev;
              return [...prev, fullMessage];
            });

            // Play sound if message is from other user
            if (fullMessage.sender_id !== currentUserId) {
              playNotificationSound();

              // Mark as read if window is focused
              if (document.hasFocus()) {
                markAsRead([fullMessage.id]);
              }
            }
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [listingId, currentUserId, fetchMessages, markAsRead]);

  // Mark unread messages as read when component mounts or gains focus
  useEffect(() => {
    if (!messages.length) return;

    const unreadIds = messages
      .filter(m => !m.read && m.receiver_id === currentUserId)
      .map(m => m.id);

    if (unreadIds.length > 0) {
      markAsRead(unreadIds);
    }
  }, [messages, currentUserId, markAsRead]);

  return {
    messages,
    loading,
    error,
    sending,
    sendMessage,
    markAsRead,
    refresh: fetchMessages,
  };
}

/**
 * Hook for fetching all conversations for the current user
 *
 * @param {string} userId - Current user's ID
 * @returns {Object} Conversations state and functions
 */
export function useMarketplaceConversations(userId) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalUnread, setTotalUnread] = useState(0);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      if (isDemo || !supabase) {
        // Demo mode
        await new Promise(resolve => setTimeout(resolve, 300));
        setConversations(DEMO_CONVERSATIONS);
        setTotalUnread(DEMO_CONVERSATIONS.reduce((sum, c) => sum + c.unread_count, 0));
      } else {
        // Fetch all messages involving the user
        const { data: messages, error: fetchError } = await supabase
          .from('marketplace_messages')
          .select(`
            id,
            listing_id,
            sender_id,
            receiver_id,
            message,
            created_at,
            read,
            listing:listing_id(id, titre, photos),
            sender:sender_id(id, nom, avatar),
            receiver:receiver_id(id, nom, avatar)
          `)
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        // Group messages into conversations
        const conversationMap = new Map();

        (messages || []).forEach(msg => {
          const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
          const otherUser = msg.sender_id === userId ? msg.receiver : msg.sender;
          const convKey = `${msg.listing_id}-${otherUserId}`;

          if (!conversationMap.has(convKey)) {
            conversationMap.set(convKey, {
              id: convKey,
              listing_id: msg.listing_id,
              listing: msg.listing,
              other_user: otherUser,
              last_message: msg.message,
              last_message_at: msg.created_at,
              unread_count: 0,
            });
          }

          // Count unread messages
          if (!msg.read && msg.receiver_id === userId) {
            const conv = conversationMap.get(convKey);
            conv.unread_count += 1;
          }
        });

        const convList = Array.from(conversationMap.values())
          .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));

        setConversations(convList);
        setTotalUnread(convList.reduce((sum, c) => sum + c.unread_count, 0));
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Subscribe to new messages
  useEffect(() => {
    if (!userId || isDemo || !supabase) {
      fetchConversations();
      return;
    }

    fetchConversations();

    // Subscribe to new messages for this user
    const channel = supabase
      .channel(`user_messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'marketplace_messages',
        },
        (payload) => {
          // Check if message involves this user
          if (payload.new.sender_id === userId || payload.new.receiver_id === userId) {
            fetchConversations();

            // Play sound for new messages from others
            if (payload.new.sender_id !== userId) {
              playNotificationSound();
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId, fetchConversations]);

  return {
    conversations,
    loading,
    error,
    totalUnread,
    refresh: fetchConversations,
  };
}

/**
 * Send notification email for new message
 * @param {string} receiverId - Receiver user ID
 * @param {Object} data - Notification data
 */
export async function notifyNewMessage(receiverId, data) {
  if (isDemo || !supabase) return;

  try {
    // This would typically call an edge function or API endpoint
    await supabase.functions.invoke('send-message-notification', {
      body: {
        receiver_id: receiverId,
        sender_name: data.sender_name,
        listing_title: data.listing_title,
        message_preview: data.message_preview,
      },
    });
  } catch (err) {
    console.error('Error sending notification:', err);
  }
}

/**
 * Report a message or user
 * @param {string} messageId - Message ID
 * @param {string} reason - Report reason
 * @param {string} reporterId - Reporter user ID
 */
export async function reportMessage(messageId, reason, reporterId) {
  if (isDemo || !supabase) {
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('marketplace_reports')
      .insert({
        message_id: messageId,
        reason,
        reporter_id: reporterId,
      });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error reporting message:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Block a user
 * @param {string} userId - Current user ID
 * @param {string} blockedUserId - User to block
 */
export async function blockUser(userId, blockedUserId) {
  if (isDemo || !supabase) {
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('marketplace_blocked_users')
      .insert({
        user_id: userId,
        blocked_user_id: blockedUserId,
      });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error blocking user:', err);
    return { success: false, error: err.message };
  }
}

export default useMarketplaceMessages;
