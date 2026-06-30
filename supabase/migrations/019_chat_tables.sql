-- ============================================================
-- Migration 019: Chat tables (channels, members, messages, reactions)
-- ============================================================

-- 1. Chat Channels
CREATE TABLE IF NOT EXISTS chat_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom' CHECK (type IN ('equipe', 'chantier', 'direct', 'custom')),
  description TEXT,
  chantier_id UUID,
  avatar_url TEXT,
  is_archived BOOLEAN DEFAULT false,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org channels" ON chat_channels
  FOR ALL USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT get_user_org_ids())
  );

CREATE INDEX IF NOT EXISTS idx_chat_channels_user_id ON chat_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_org_id ON chat_channels(organization_id);

-- 2. Chat Members
CREATE TABLE IF NOT EXISTS chat_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  nickname TEXT,
  muted BOOLEAN DEFAULT false,
  muted_until TIMESTAMPTZ,
  last_read_at TIMESTAMPTZ DEFAULT now(),
  unread_count INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  user_email TEXT,
  user_name TEXT,
  user_avatar TEXT,
  UNIQUE(channel_id, user_id)
);

ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members see own channels" ON chat_members
  FOR ALL USING (
    user_id = auth.uid()
    OR channel_id IN (SELECT channel_id FROM chat_members WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_chat_members_channel ON chat_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_id);

-- 3. Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'file', 'image', 'voice', 'system')),
  attachments JSONB DEFAULT '[]'::jsonb,
  voice_duration_ms INTEGER,
  reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  system_event TEXT,
  system_metadata JSONB,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  user_name TEXT,
  user_avatar TEXT,
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see messages in their channels" ON chat_messages
  FOR ALL USING (
    channel_id IN (SELECT channel_id FROM chat_members WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);

-- 4. Chat Reactions
CREATE TABLE IF NOT EXISTS chat_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE chat_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see reactions in their channels" ON chat_reactions
  FOR ALL USING (
    message_id IN (
      SELECT m.id FROM chat_messages m
      JOIN chat_members cm ON cm.channel_id = m.channel_id
      WHERE cm.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_chat_reactions_message ON chat_reactions(message_id);
