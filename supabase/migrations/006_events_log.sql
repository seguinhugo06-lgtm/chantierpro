-- ============================================================================
-- Migration: 006_events_log.sql
-- Description: Events log table for tracking all automated notifications
-- ============================================================================

-- ============================================================================
-- EVENTS LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS events_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  success BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_events_log_event_type ON events_log(event_type);
CREATE INDEX IF NOT EXISTS idx_events_log_entity ON events_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_events_log_user ON events_log(user_id);
CREATE INDEX IF NOT EXISTS idx_events_log_triggered_at ON events_log(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_log_success ON events_log(success) WHERE NOT success;

-- RLS policies
ALTER TABLE events_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own events"
  ON events_log FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert (for Edge Functions)
CREATE POLICY "Service role can insert events"
  ON events_log FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- ADD last_photo_at TO CHANTIERS
-- ============================================================================

ALTER TABLE chantiers
ADD COLUMN IF NOT EXISTS last_photo_at TIMESTAMPTZ;

-- Index for photo activity queries
CREATE INDEX IF NOT EXISTS idx_chantiers_last_photo
ON chantiers(last_photo_at DESC)
WHERE last_photo_at IS NOT NULL;

-- ============================================================================
-- AI SUGGESTIONS TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for ai_suggestions
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user ON ai_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_type ON ai_suggestions(type);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_unread ON ai_suggestions(user_id, is_read) WHERE NOT is_read AND NOT is_dismissed;

-- RLS for ai_suggestions
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own suggestions"
  ON ai_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own suggestions"
  ON ai_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert suggestions"
  ON ai_suggestions FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get recent events for a user
CREATE OR REPLACE FUNCTION get_recent_events(
  p_user_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  entity_type TEXT,
  entity_id UUID,
  success BOOLEAN,
  metadata JSONB,
  triggered_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    id,
    event_type,
    entity_type,
    entity_id,
    success,
    metadata,
    triggered_at
  FROM events_log
  WHERE user_id = p_user_id
  ORDER BY triggered_at DESC
  LIMIT p_limit;
$$;

-- Get unread suggestions count
CREATE OR REPLACE FUNCTION get_unread_suggestions_count(p_user_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INT
  FROM ai_suggestions
  WHERE user_id = p_user_id
    AND NOT is_read
    AND NOT is_dismissed;
$$;

-- Mark suggestion as read
CREATE OR REPLACE FUNCTION mark_suggestion_read(p_suggestion_id UUID)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE ai_suggestions
  SET is_read = true, updated_at = now()
  WHERE id = p_suggestion_id
    AND auth.uid() = user_id;
$$;

-- Dismiss suggestion
CREATE OR REPLACE FUNCTION dismiss_suggestion(p_suggestion_id UUID)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE ai_suggestions
  SET is_dismissed = true, updated_at = now()
  WHERE id = p_suggestion_id
    AND auth.uid() = user_id;
$$;

-- ============================================================================
-- NOTIFICATION FLAGS ON DEVIS (if not already added)
-- ============================================================================

ALTER TABLE devis
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false;

ALTER TABLE devis
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ;

-- Index for pending notifications
CREATE INDEX IF NOT EXISTS idx_devis_notification_pending
ON devis(notification_sent)
WHERE NOT notification_sent;
