/**
 * chatService.js — CRUD + realtime helpers for messaging
 *
 * Pattern: entrepriseService.js  — demo mode via localStorage, prod via Supabase.
 * All DB column names are snake_case; JS objects use camelCase.
 */

import { isDemo } from '../supabaseClient';
import { scopeToOrg, withOrgScope } from '../lib/queryHelper';

const DEMO_KEY = 'batigesti_chat';

// ── Field mappings ──────────────────────────────────────────────────────────────

function channelFromSupabase(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    organizationId: row.organization_id,
    name: row.name,
    type: row.type,
    description: row.description,
    chantierId: row.chantier_id,
    avatarUrl: row.avatar_url,
    isArchived: row.is_archived,
    lastMessageAt: row.last_message_at,
    lastMessagePreview: row.last_message_preview,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Joined data
    members: row.chat_members?.map(memberFromSupabase) || [],
    unreadCount: row._unreadCount ?? 0,
    // For direct channels, we'll populate the other user
    otherUser: row._otherUser || null,
  };
}

function memberFromSupabase(row) {
  if (!row) return null;
  return {
    id: row.id,
    channelId: row.channel_id,
    userId: row.user_id,
    role: row.role,
    nickname: row.nickname,
    muted: row.muted,
    mutedUntil: row.muted_until,
    lastReadAt: row.last_read_at,
    unreadCount: row.unread_count,
    joinedAt: row.joined_at,
    leftAt: row.left_at,
    // Joined user profile
    userEmail: row.user_email,
    userName: row.user_name,
    userAvatar: row.user_avatar,
  };
}

function messageFromSupabase(row) {
  if (!row) return null;
  return {
    id: row.id,
    channelId: row.channel_id,
    userId: row.user_id,
    content: row.content,
    contentType: row.content_type,
    attachments: row.attachments || [],
    voiceDurationMs: row.voice_duration_ms,
    replyToId: row.reply_to_id,
    systemEvent: row.system_event,
    systemMetadata: row.system_metadata,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    // Joined data
    reactions: row.chat_reactions?.map(reactionFromSupabase) || [],
    replyTo: row.reply_to ? messageFromSupabase(row.reply_to) : null,
    // User info (joined)
    userName: row.user_name,
    userAvatar: row.user_avatar,
    userEmail: row.user_email,
  };
}

function reactionFromSupabase(row) {
  if (!row) return null;
  return {
    id: row.id,
    messageId: row.message_id,
    userId: row.user_id,
    emoji: row.emoji,
    createdAt: row.created_at,
    userName: row.user_name,
  };
}

// ── Demo data ───────────────────────────────────────────────────────────────────

const DEMO_USER_ID = 'demo-user-id';

const DEMO_USERS = [
  { id: DEMO_USER_ID, email: 'demo@batigesti.fr', name: 'Vous (Démo)', avatar: null },
  { id: 'demo-user-2', email: 'pierre@example.com', name: 'Pierre Martin', avatar: null },
  { id: 'demo-user-3', email: 'marie@example.com', name: 'Marie Dupont', avatar: null },
  { id: 'demo-user-4', email: 'jean@example.com', name: 'Jean Lefebvre', avatar: null },
];

function getDemoData() {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return initDemoData();
}

function saveDemoData(data) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(data));
}

function initDemoData() {
  const now = new Date().toISOString();
  const hourAgo = new Date(Date.now() - 3600000).toISOString();
  const twoHoursAgo = new Date(Date.now() - 7200000).toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();

  const data = {
    channels: [
      {
        id: 'demo-channel-equipe',
        userId: DEMO_USER_ID,
        name: 'Équipe Générale',
        type: 'equipe',
        description: 'Canal principal de l\'équipe',
        lastMessageAt: hourAgo,
        lastMessagePreview: 'Marie: N\'oubliez pas la réunion demain matin',
        isArchived: false,
        createdAt: yesterday,
        updatedAt: hourAgo,
        unreadCount: 2,
      },
      {
        id: 'demo-channel-chantier-1',
        userId: DEMO_USER_ID,
        name: 'Chantier Dupont — Rénovation',
        type: 'chantier',
        chantierId: 'demo-chantier-1',
        description: 'Discussion du chantier',
        lastMessageAt: twoHoursAgo,
        lastMessagePreview: 'Pierre: Les matériaux sont livrés',
        isArchived: false,
        createdAt: yesterday,
        updatedAt: twoHoursAgo,
        unreadCount: 0,
      },
      {
        id: 'demo-channel-direct-1',
        userId: DEMO_USER_ID,
        name: 'Direct',
        type: 'direct',
        lastMessageAt: yesterday,
        lastMessagePreview: 'Ok, à demain !',
        isArchived: false,
        createdAt: yesterday,
        updatedAt: yesterday,
        unreadCount: 1,
        otherUser: DEMO_USERS[1],
      },
    ],
    members: {
      'demo-channel-equipe': DEMO_USERS.map((u, i) => ({
        id: `demo-member-eq-${i}`,
        channelId: 'demo-channel-equipe',
        userId: u.id,
        role: i === 0 ? 'admin' : 'member',
        muted: false,
        unreadCount: u.id === DEMO_USER_ID ? 2 : 0,
        lastReadAt: u.id === DEMO_USER_ID ? twoHoursAgo : now,
        joinedAt: yesterday,
        userName: u.name,
        userEmail: u.email,
      })),
      'demo-channel-chantier-1': DEMO_USERS.slice(0, 3).map((u, i) => ({
        id: `demo-member-ch-${i}`,
        channelId: 'demo-channel-chantier-1',
        userId: u.id,
        role: i === 0 ? 'admin' : 'member',
        muted: false,
        unreadCount: 0,
        lastReadAt: now,
        joinedAt: yesterday,
        userName: u.name,
        userEmail: u.email,
      })),
      'demo-channel-direct-1': [DEMO_USERS[0], DEMO_USERS[1]].map((u, i) => ({
        id: `demo-member-dm-${i}`,
        channelId: 'demo-channel-direct-1',
        userId: u.id,
        role: 'member',
        muted: false,
        unreadCount: u.id === DEMO_USER_ID ? 1 : 0,
        lastReadAt: u.id === DEMO_USER_ID ? yesterday : now,
        joinedAt: yesterday,
        userName: u.name,
        userEmail: u.email,
      })),
    },
    messages: {
      'demo-channel-equipe': [
        {
          id: 'demo-msg-eq-1',
          channelId: 'demo-channel-equipe',
          userId: DEMO_USER_ID,
          content: 'Bonjour à tous ! Prêts pour la semaine ?',
          contentType: 'text',
          attachments: [],
          createdAt: yesterday,
          reactions: [{ id: 'r1', messageId: 'demo-msg-eq-1', userId: 'demo-user-2', emoji: '👍', userName: 'Pierre Martin' }],
          userName: 'Vous (Démo)',
        },
        {
          id: 'demo-msg-eq-2',
          channelId: 'demo-channel-equipe',
          userId: 'demo-user-2',
          content: 'Oui ! Les matériaux pour Dupont arrivent ce matin.',
          contentType: 'text',
          attachments: [],
          createdAt: twoHoursAgo,
          reactions: [],
          userName: 'Pierre Martin',
        },
        {
          id: 'demo-msg-eq-3',
          channelId: 'demo-channel-equipe',
          userId: 'demo-user-3',
          content: 'N\'oubliez pas la réunion demain matin',
          contentType: 'text',
          attachments: [],
          createdAt: hourAgo,
          reactions: [],
          userName: 'Marie Dupont',
        },
      ],
      'demo-channel-chantier-1': [
        {
          id: 'demo-msg-ch-1',
          channelId: 'demo-channel-chantier-1',
          userId: 'demo-user-2',
          content: 'Les matériaux sont livrés',
          contentType: 'text',
          attachments: [],
          createdAt: twoHoursAgo,
          reactions: [{ id: 'r2', messageId: 'demo-msg-ch-1', userId: DEMO_USER_ID, emoji: '✅', userName: 'Vous (Démo)' }],
          userName: 'Pierre Martin',
        },
      ],
      'demo-channel-direct-1': [
        {
          id: 'demo-msg-dm-1',
          channelId: 'demo-channel-direct-1',
          userId: 'demo-user-2',
          content: 'Tu peux me rappeler l\'adresse du chantier ?',
          contentType: 'text',
          attachments: [],
          createdAt: yesterday,
          reactions: [],
          userName: 'Pierre Martin',
        },
        {
          id: 'demo-msg-dm-2',
          channelId: 'demo-channel-direct-1',
          userId: DEMO_USER_ID,
          content: '12 rue des Lilas, 75020 Paris',
          contentType: 'text',
          attachments: [],
          createdAt: yesterday,
          reactions: [],
          userName: 'Vous (Démo)',
        },
        {
          id: 'demo-msg-dm-3',
          channelId: 'demo-channel-direct-1',
          userId: 'demo-user-2',
          content: 'Ok, à demain !',
          contentType: 'text',
          attachments: [],
          createdAt: yesterday,
          reactions: [],
          userName: 'Pierre Martin',
        },
      ],
    },
  };

  saveDemoData(data);
  return data;
}

// ── Channels ────────────────────────────────────────────────────────────────────

/**
 * Load all channels the user belongs to
 */
export async function loadChannels(supabase, { userId, orgId }) {
  if (isDemo) {
    const data = getDemoData();
    return data.channels;
  }

  // Get channels where user is a member
  const query = supabase
    .from('chat_channels')
    .select(`
      *,
      chat_members!inner(
        user_id, role, muted, unread_count, last_read_at, joined_at, left_at
      )
    `)
    .eq('chat_members.user_id', userId)
    .is('chat_members.left_at', null)
    .eq('is_archived', false)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(row => {
    const myMembership = row.chat_members?.find(m => m.user_id === userId);
    return {
      ...channelFromSupabase(row),
      unreadCount: myMembership?.unread_count || 0,
      muted: myMembership?.muted || false,
    };
  });
}

/**
 * Create a new channel
 */
export async function createChannel(supabase, { userId, orgId, name, type, description, chantierId, memberIds }) {
  if (isDemo) {
    const data = getDemoData();
    const now = new Date().toISOString();
    const newChannel = {
      id: `demo-channel-${Date.now()}`,
      userId,
      name,
      type,
      description: description || null,
      chantierId: chantierId || null,
      lastMessageAt: null,
      lastMessagePreview: null,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      unreadCount: 0,
    };
    data.channels.unshift(newChannel);
    data.members[newChannel.id] = [
      { id: `demo-member-${Date.now()}`, channelId: newChannel.id, userId, role: 'admin', muted: false, unreadCount: 0, joinedAt: now, userName: 'Vous (Démo)' },
      ...(memberIds || []).map((uid, i) => {
        const u = DEMO_USERS.find(u => u.id === uid) || { id: uid, name: uid, email: '' };
        return { id: `demo-member-${Date.now()}-${i}`, channelId: newChannel.id, userId: uid, role: 'member', muted: false, unreadCount: 0, joinedAt: now, userName: u.name, userEmail: u.email };
      }),
    ];
    data.messages[newChannel.id] = [];
    saveDemoData(data);
    return newChannel;
  }

  const channelData = withOrgScope({
    name,
    type,
    description: description || null,
    chantier_id: chantierId || null,
  }, userId, orgId);

  const { data: channel, error } = await supabase
    .from('chat_channels')
    .insert(channelData)
    .select()
    .single();

  if (error) throw error;

  // Add creator as admin
  const members = [
    { channel_id: channel.id, user_id: userId, role: 'admin' },
    ...(memberIds || []).map(uid => ({ channel_id: channel.id, user_id: uid, role: 'member' })),
  ];

  await supabase.from('chat_members').insert(members);

  // Add system message
  await supabase.from('chat_messages').insert({
    channel_id: channel.id,
    user_id: userId,
    content: 'a créé le canal',
    content_type: 'system',
    system_event: 'channel_created',
  });

  return channelFromSupabase(channel);
}

/**
 * Get or create a direct channel with another user
 */
export async function getOrCreateDirectChannel(supabase, { userId, otherUserId, orgId }) {
  if (isDemo) {
    const data = getDemoData();
    // Check existing
    const existing = data.channels.find(c =>
      c.type === 'direct' && c.otherUser?.id === otherUserId
    );
    if (existing) return existing;

    // Create new
    const other = DEMO_USERS.find(u => u.id === otherUserId) || { id: otherUserId, name: otherUserId };
    const now = new Date().toISOString();
    const newChannel = {
      id: `demo-channel-dm-${Date.now()}`,
      userId,
      name: 'Direct',
      type: 'direct',
      lastMessageAt: null,
      lastMessagePreview: null,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      unreadCount: 0,
      otherUser: other,
    };
    data.channels.push(newChannel);
    data.members[newChannel.id] = [
      { id: `dm-m-${Date.now()}-0`, channelId: newChannel.id, userId, role: 'member', userName: 'Vous (Démo)' },
      { id: `dm-m-${Date.now()}-1`, channelId: newChannel.id, userId: otherUserId, role: 'member', userName: other.name },
    ];
    data.messages[newChannel.id] = [];
    saveDemoData(data);
    return newChannel;
  }

  const { data: channelId, error } = await supabase.rpc('get_or_create_direct_channel', {
    p_other_user_id: otherUserId,
    p_org_id: orgId || null,
  });

  if (error) throw error;

  // Fetch the full channel
  const { data: channel } = await supabase
    .from('chat_channels')
    .select('*')
    .eq('id', channelId)
    .single();

  return channelFromSupabase(channel);
}

// ── Messages ────────────────────────────────────────────────────────────────────

/**
 * Load messages for a channel (cursor-based pagination)
 */
export async function loadMessages(supabase, { channelId, cursor, limit = 30 }) {
  if (isDemo) {
    const data = getDemoData();
    const msgs = data.messages[channelId] || [];
    // Sort newest first for cursor-based pagination, then reverse for display
    const sorted = [...msgs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    let filtered = sorted;
    if (cursor) {
      const cursorDate = new Date(cursor);
      filtered = sorted.filter(m => new Date(m.createdAt) < cursorDate);
    }

    const page = filtered.slice(0, limit);
    return {
      messages: page.reverse(), // chronological order for display
      hasMore: filtered.length > limit,
      nextCursor: page.length > 0 ? page[0].createdAt : null,
    };
  }

  let query = supabase
    .from('chat_messages')
    .select(`
      *,
      chat_reactions(id, user_id, emoji, created_at)
    `)
    .eq('channel_id', channelId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  const messages = (data || []).map(messageFromSupabase).reverse();

  return {
    messages,
    hasMore: (data || []).length === limit,
    nextCursor: data?.length > 0 ? data[data.length - 1].created_at : null,
  };
}

/**
 * Send a message
 */
export async function sendMessage(supabase, { channelId, userId, content, contentType = 'text', attachments, voiceDurationMs, replyToId }) {
  if (isDemo) {
    const data = getDemoData();
    const now = new Date().toISOString();
    const user = DEMO_USERS.find(u => u.id === userId) || { name: 'Inconnu' };
    const msg = {
      id: `demo-msg-${Date.now()}`,
      channelId,
      userId,
      content,
      contentType,
      attachments: attachments || [],
      voiceDurationMs: voiceDurationMs || null,
      replyToId: replyToId || null,
      createdAt: now,
      reactions: [],
      userName: user.name,
    };
    if (!data.messages[channelId]) data.messages[channelId] = [];
    data.messages[channelId].push(msg);

    // Update channel preview
    const ch = data.channels.find(c => c.id === channelId);
    if (ch) {
      ch.lastMessageAt = now;
      ch.lastMessagePreview = contentType === 'text' ? `${user.name}: ${content}`.slice(0, 100) : `${user.name}: [${contentType}]`;
      ch.updatedAt = now;
    }
    saveDemoData(data);
    return msg;
  }

  const messageData = {
    channel_id: channelId,
    user_id: userId,
    content,
    content_type: contentType,
    attachments: attachments || [],
    voice_duration_ms: voiceDurationMs || null,
    reply_to_id: replyToId || null,
  };

  const { data: msg, error } = await supabase
    .from('chat_messages')
    .insert(messageData)
    .select(`
      *,
      chat_reactions(id, user_id, emoji, created_at)
    `)
    .single();

  if (error) throw error;
  return messageFromSupabase(msg);
}

/**
 * Edit a message
 */
export async function editMessage(supabase, { messageId, content, userId }) {
  if (isDemo) {
    const data = getDemoData();
    for (const msgs of Object.values(data.messages)) {
      const msg = msgs.find(m => m.id === messageId);
      if (msg && msg.userId === userId) {
        msg.content = content;
        msg.editedAt = new Date().toISOString();
        saveDemoData(data);
        return msg;
      }
    }
    throw new Error('Message non trouvé');
  }

  const { data: msg, error } = await supabase
    .from('chat_messages')
    .update({ content, edited_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return messageFromSupabase(msg);
}

/**
 * Delete a message (soft delete)
 */
export async function deleteMessage(supabase, { messageId, userId }) {
  if (isDemo) {
    const data = getDemoData();
    for (const msgs of Object.values(data.messages)) {
      const msg = msgs.find(m => m.id === messageId);
      if (msg && msg.userId === userId) {
        msg.deletedAt = new Date().toISOString();
        msg.content = null;
        saveDemoData(data);
        return;
      }
    }
    return;
  }

  await supabase
    .from('chat_messages')
    .update({ deleted_at: new Date().toISOString(), content: null })
    .eq('id', messageId)
    .eq('user_id', userId);
}

// ── Reactions ───────────────────────────────────────────────────────────────────

export async function toggleReaction(supabase, { messageId, userId, emoji }) {
  if (isDemo) {
    const data = getDemoData();
    for (const msgs of Object.values(data.messages)) {
      const msg = msgs.find(m => m.id === messageId);
      if (msg) {
        const existing = msg.reactions?.findIndex(r => r.userId === userId && r.emoji === emoji);
        if (existing >= 0) {
          msg.reactions.splice(existing, 1);
        } else {
          const user = DEMO_USERS.find(u => u.id === userId) || { name: 'Inconnu' };
          msg.reactions = msg.reactions || [];
          msg.reactions.push({ id: `r-${Date.now()}`, messageId, userId, emoji, userName: user.name, createdAt: new Date().toISOString() });
        }
        saveDemoData(data);
        return msg.reactions;
      }
    }
    return [];
  }

  // Check if reaction exists
  const { data: existing } = await supabase
    .from('chat_reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .maybeSingle();

  if (existing) {
    await supabase.from('chat_reactions').delete().eq('id', existing.id);
  } else {
    await supabase.from('chat_reactions').insert({
      message_id: messageId,
      user_id: userId,
      emoji,
    });
  }

  // Return updated reactions
  const { data: reactions } = await supabase
    .from('chat_reactions')
    .select('*')
    .eq('message_id', messageId);

  return (reactions || []).map(reactionFromSupabase);
}

// ── Read status ─────────────────────────────────────────────────────────────────

export async function markChannelRead(supabase, { channelId, userId }) {
  if (isDemo) {
    const data = getDemoData();
    const ch = data.channels.find(c => c.id === channelId);
    if (ch) ch.unreadCount = 0;
    const members = data.members[channelId] || [];
    const m = members.find(m => m.userId === userId);
    if (m) { m.unreadCount = 0; m.lastReadAt = new Date().toISOString(); }
    saveDemoData(data);
    return;
  }

  await supabase.rpc('mark_channel_read', { p_channel_id: channelId });
}

export async function getTotalUnreadCount(supabase) {
  if (isDemo) {
    const data = getDemoData();
    return data.channels.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }

  const { data, error } = await supabase.rpc('get_total_unread_count');
  if (error) return 0;
  return data || 0;
}

// ── Members ─────────────────────────────────────────────────────────────────────

export async function loadChannelMembers(supabase, { channelId }) {
  if (isDemo) {
    const data = getDemoData();
    return data.members[channelId] || [];
  }

  const { data, error } = await supabase
    .from('chat_members')
    .select('*')
    .eq('channel_id', channelId)
    .is('left_at', null);

  if (error) throw error;
  return (data || []).map(memberFromSupabase);
}

export async function addChannelMember(supabase, { channelId, userId, addedByUserId }) {
  if (isDemo) {
    const data = getDemoData();
    const user = DEMO_USERS.find(u => u.id === userId) || { id: userId, name: userId };
    if (!data.members[channelId]) data.members[channelId] = [];
    data.members[channelId].push({
      id: `demo-member-${Date.now()}`,
      channelId,
      userId,
      role: 'member',
      muted: false,
      unreadCount: 0,
      joinedAt: new Date().toISOString(),
      userName: user.name,
    });
    saveDemoData(data);
    return;
  }

  await supabase.from('chat_members').insert({
    channel_id: channelId,
    user_id: userId,
    role: 'member',
  });

  // System message
  await supabase.from('chat_messages').insert({
    channel_id: channelId,
    user_id: addedByUserId,
    content: 'a ajouté un membre',
    content_type: 'system',
    system_event: 'member_added',
    system_metadata: { added_user_id: userId },
  });
}

export async function removeChannelMember(supabase, { channelId, userId }) {
  if (isDemo) {
    const data = getDemoData();
    const members = data.members[channelId] || [];
    const idx = members.findIndex(m => m.userId === userId);
    if (idx >= 0) members[idx].leftAt = new Date().toISOString();
    saveDemoData(data);
    return;
  }

  await supabase
    .from('chat_members')
    .update({ left_at: new Date().toISOString() })
    .eq('channel_id', channelId)
    .eq('user_id', userId);
}

// ── Search ──────────────────────────────────────────────────────────────────────

export async function searchMessages(supabase, { query, userId, limit = 20 }) {
  if (isDemo) {
    const data = getDemoData();
    const q = query.toLowerCase();
    const results = [];
    for (const [channelId, msgs] of Object.entries(data.messages)) {
      for (const msg of msgs) {
        if (msg.content?.toLowerCase().includes(q)) {
          const ch = data.channels.find(c => c.id === channelId);
          results.push({ ...msg, channelName: ch?.name });
        }
      }
    }
    return results.slice(0, limit);
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .select(`
      *,
      chat_channels!inner(name, type)
    `)
    .textSearch('search_vector', query, { type: 'websearch', config: 'french' })
    .is('deleted_at', null)
    .limit(limit);

  if (error) throw error;

  return (data || []).map(row => ({
    ...messageFromSupabase(row),
    channelName: row.chat_channels?.name,
    channelType: row.chat_channels?.type,
  }));
}

// ── Channel operations ──────────────────────────────────────────────────────────

export async function updateChannel(supabase, { channelId, updates, userId }) {
  if (isDemo) {
    const data = getDemoData();
    const ch = data.channels.find(c => c.id === channelId);
    if (ch) {
      Object.assign(ch, updates, { updatedAt: new Date().toISOString() });
      saveDemoData(data);
    }
    return ch;
  }

  const { data, error } = await supabase
    .from('chat_channels')
    .update({
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.isArchived !== undefined && { is_archived: updates.isArchived }),
    })
    .eq('id', channelId)
    .select()
    .single();

  if (error) throw error;
  return channelFromSupabase(data);
}

export async function archiveChannel(supabase, { channelId, userId }) {
  return updateChannel(supabase, { channelId, updates: { isArchived: true }, userId });
}

export async function toggleMuteChannel(supabase, { channelId, userId, muted }) {
  if (isDemo) {
    const data = getDemoData();
    const members = data.members[channelId] || [];
    const m = members.find(m => m.userId === userId);
    if (m) m.muted = muted;
    saveDemoData(data);
    return;
  }

  await supabase
    .from('chat_members')
    .update({ muted })
    .eq('channel_id', channelId)
    .eq('user_id', userId);
}

// ── File upload for chat ────────────────────────────────────────────────────────

const CHAT_STORAGE_BUCKET = 'chat-attachments';

export async function uploadChatFile(supabase, { file, channelId, userId }) {
  if (isDemo) {
    // Simulate upload
    return {
      name: file.name,
      url: URL.createObjectURL(file),
      size: file.size,
      mimeType: file.type,
      storagePath: `demo/${channelId}/${file.name}`,
    };
  }

  const ext = file.name.split('.').pop();
  const filename = `${userId}/${channelId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(CHAT_STORAGE_BUCKET)
    .upload(filename, file, { upsert: false });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from(CHAT_STORAGE_BUCKET)
    .getPublicUrl(filename);

  return {
    name: file.name,
    url: urlData.publicUrl,
    size: file.size,
    mimeType: file.type,
    storagePath: filename,
  };
}

// Re-export DEMO_USERS for use in components
export { DEMO_USERS };
