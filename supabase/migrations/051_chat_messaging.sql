-- Migration 051: Chat / Messagerie interne
-- Real-time messaging system with channels, reactions, push notifications

-- ─── Table: chat_channels ──────────────────────────────────────────────────────
-- A channel can be: chantier (auto-created), equipe (team-wide), direct (1-to-1)

CREATE TABLE IF NOT EXISTS chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('chantier', 'equipe', 'direct', 'custom')),
  description TEXT,

  -- Link to chantier if type = 'chantier'
  chantier_id UUID REFERENCES chantiers(id) ON DELETE CASCADE,

  avatar_url TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Table: chat_members ───────────────────────────────────────────────────────
-- Who belongs to which channel, with per-user settings

CREATE TABLE IF NOT EXISTS chat_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  nickname TEXT,

  -- Notification preferences
  muted BOOLEAN DEFAULT FALSE,
  muted_until TIMESTAMPTZ,

  -- Unread tracking
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  unread_count INTEGER DEFAULT 0,

  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,

  UNIQUE(channel_id, user_id)
);

-- ─── Table: chat_messages ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Content
  content TEXT,
  content_type TEXT DEFAULT 'text'
    CHECK (content_type IN ('text', 'image', 'file', 'voice', 'system', 'location')),

  -- Attachments (Supabase Storage references)
  attachments JSONB DEFAULT '[]',
  -- Format: [{ name, url, size, mimeType, storagePath, thumbnailUrl }]

  -- Voice message metadata
  voice_duration_ms INTEGER,

  -- Reply / thread
  reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,

  -- System message metadata (e.g., "X a rejoint le canal")
  system_event TEXT,
  system_metadata JSONB DEFAULT '{}',

  -- Edit / delete
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,

  -- Full-text search
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('french', COALESCE(content, ''))
  ) STORED,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Table: chat_reactions ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(message_id, user_id, emoji)
);

-- ─── Table: push_subscriptions ─────────────────────────────────────────────────
-- Web Push API subscriptions for each user/device

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,

  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, endpoint)
);

-- ─── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_chat_channels_user ON chat_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_org ON chat_channels(organization_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_chantier ON chat_channels(chantier_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_type ON chat_channels(type);
CREATE INDEX IF NOT EXISTS idx_chat_channels_last_msg ON chat_channels(last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_chat_members_channel ON chat_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_unread ON chat_members(user_id, unread_count) WHERE unread_count > 0;

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply ON chat_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_messages_search ON chat_messages USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_chat_messages_type ON chat_messages(channel_id, content_type);

CREATE INDEX IF NOT EXISTS idx_chat_reactions_message ON chat_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_reactions_user ON chat_reactions(user_id);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

-- ─── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Channels: viewable if you are a member
CREATE POLICY chat_channels_select ON chat_channels FOR SELECT TO authenticated
  USING (
    id IN (SELECT channel_id FROM chat_members WHERE user_id = auth.uid() AND left_at IS NULL)
    OR user_id = auth.uid()
  );

CREATE POLICY chat_channels_insert ON chat_channels FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY chat_channels_update ON chat_channels FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR id IN (SELECT channel_id FROM chat_members WHERE user_id = auth.uid() AND role = 'admin' AND left_at IS NULL)
  );

-- Members: viewable if you are in the same channel
CREATE POLICY chat_members_select ON chat_members FOR SELECT TO authenticated
  USING (
    channel_id IN (SELECT channel_id FROM chat_members cm2 WHERE cm2.user_id = auth.uid() AND cm2.left_at IS NULL)
  );

CREATE POLICY chat_members_insert ON chat_members FOR INSERT TO authenticated
  WITH CHECK (
    -- Channel creator or admin can add members
    channel_id IN (
      SELECT id FROM chat_channels WHERE user_id = auth.uid()
      UNION
      SELECT channel_id FROM chat_members WHERE user_id = auth.uid() AND role = 'admin' AND left_at IS NULL
    )
    OR user_id = auth.uid() -- user can join themselves (for direct channels)
  );

CREATE POLICY chat_members_update ON chat_members FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR channel_id IN (SELECT channel_id FROM chat_members WHERE user_id = auth.uid() AND role = 'admin' AND left_at IS NULL)
  );

-- Messages: viewable if you are a member of the channel
CREATE POLICY chat_messages_select ON chat_messages FOR SELECT TO authenticated
  USING (
    channel_id IN (SELECT channel_id FROM chat_members WHERE user_id = auth.uid() AND left_at IS NULL)
  );

CREATE POLICY chat_messages_insert ON chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND channel_id IN (SELECT channel_id FROM chat_members WHERE user_id = auth.uid() AND left_at IS NULL)
  );

CREATE POLICY chat_messages_update ON chat_messages FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Reactions: viewable if you can see the message's channel
CREATE POLICY chat_reactions_select ON chat_reactions FOR SELECT TO authenticated
  USING (
    message_id IN (
      SELECT id FROM chat_messages WHERE channel_id IN (
        SELECT channel_id FROM chat_members WHERE user_id = auth.uid() AND left_at IS NULL
      )
    )
  );

CREATE POLICY chat_reactions_insert ON chat_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY chat_reactions_delete ON chat_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Push subscriptions: only own
CREATE POLICY push_subs_select ON push_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY push_subs_insert ON push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY push_subs_update ON push_subscriptions FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY push_subs_delete ON push_subscriptions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ─── Triggers ──────────────────────────────────────────────────────────────────

-- Auto-update updated_at on chat_channels
CREATE OR REPLACE FUNCTION update_chat_channel_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_chat_channels_updated
  BEFORE UPDATE ON chat_channels
  FOR EACH ROW EXECUTE FUNCTION update_chat_channel_timestamp();

-- Auto-update channel last_message when new message inserted
CREATE OR REPLACE FUNCTION update_channel_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_channels
  SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(COALESCE(NEW.content, '[' || NEW.content_type || ']'), 100),
    updated_at = NOW()
  WHERE id = NEW.channel_id;

  -- Increment unread_count for all members except sender
  UPDATE chat_members
  SET unread_count = unread_count + 1
  WHERE channel_id = NEW.channel_id
    AND user_id != NEW.user_id
    AND left_at IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_chat_message_inserted
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_channel_last_message();

-- ─── RPC: Mark channel as read ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION mark_channel_read(p_channel_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE chat_members
  SET
    last_read_at = NOW(),
    unread_count = 0
  WHERE channel_id = p_channel_id
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── RPC: Get total unread count across all channels ───────────────────────────

CREATE OR REPLACE FUNCTION get_total_unread_count()
RETURNS INTEGER AS $$
DECLARE
  total INTEGER;
BEGIN
  SELECT COALESCE(SUM(unread_count), 0) INTO total
  FROM chat_members
  WHERE user_id = auth.uid()
    AND left_at IS NULL
    AND muted = FALSE;
  RETURN total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── RPC: Get or create a direct channel between two users ─────────────────────

CREATE OR REPLACE FUNCTION get_or_create_direct_channel(
  p_other_user_id UUID,
  p_org_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_channel_id UUID;
  v_my_id UUID := auth.uid();
BEGIN
  -- Find existing direct channel between these two users
  SELECT cm1.channel_id INTO v_channel_id
  FROM chat_members cm1
  JOIN chat_members cm2 ON cm1.channel_id = cm2.channel_id
  JOIN chat_channels cc ON cc.id = cm1.channel_id
  WHERE cm1.user_id = v_my_id
    AND cm2.user_id = p_other_user_id
    AND cc.type = 'direct'
    AND cm1.left_at IS NULL
    AND cm2.left_at IS NULL
  LIMIT 1;

  IF v_channel_id IS NOT NULL THEN
    RETURN v_channel_id;
  END IF;

  -- Create new direct channel
  INSERT INTO chat_channels (user_id, organization_id, name, type)
  VALUES (v_my_id, p_org_id, 'Direct', 'direct')
  RETURNING id INTO v_channel_id;

  -- Add both users as members
  INSERT INTO chat_members (channel_id, user_id, role) VALUES
    (v_channel_id, v_my_id, 'admin'),
    (v_channel_id, p_other_user_id, 'member');

  RETURN v_channel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Grant access ──────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION mark_channel_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_unread_count() TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_direct_channel(UUID, UUID) TO authenticated;
