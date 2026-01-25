-- ============================================================================
-- Migration: 006_events_log.sql (FIXED)
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

CREATE INDEX IF NOT EXISTS idx_events_log_event_type ON events_log(event_type);
CREATE INDEX IF NOT EXISTS idx_events_log_entity ON events_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_events_log_user ON events_log(user_id);
CREATE INDEX IF NOT EXISTS idx_events_log_triggered_at ON events_log(triggered_at DESC);

ALTER TABLE events_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own events" ON events_log;
CREATE POLICY "Users can view their own events"
  ON events_log FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert events" ON events_log;
CREATE POLICY "Service role can insert events"
  ON events_log FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- ADD last_photo_at TO CHANTIERS
-- ============================================================================

ALTER TABLE chantiers
ADD COLUMN IF NOT EXISTS last_photo_at TIMESTAMPTZ;

-- ============================================================================
-- FIX AI_SUGGESTIONS TABLE - Add missing columns
-- ============================================================================

ALTER TABLE ai_suggestions
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

ALTER TABLE ai_suggestions
ADD COLUMN IF NOT EXISTS is_dismissed BOOLEAN DEFAULT false;

ALTER TABLE ai_suggestions
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';

ALTER TABLE ai_suggestions
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';

-- Now create index (columns exist now)
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_unread
ON ai_suggestions(user_id)
WHERE is_read = false AND is_dismissed = false;

-- RLS for ai_suggestions
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own suggestions" ON ai_suggestions;
CREATE POLICY "Users can view their own suggestions"
  ON ai_suggestions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own suggestions" ON ai_suggestions;
CREATE POLICY "Users can update their own suggestions"
  ON ai_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert suggestions" ON ai_suggestions;
CREATE POLICY "Service role can insert suggestions"
  ON ai_suggestions FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- NOTIFICATION FLAGS ON DEVIS
-- ============================================================================

ALTER TABLE devis
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false;

ALTER TABLE devis
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

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

CREATE OR REPLACE FUNCTION get_unread_suggestions_count(p_user_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INT
  FROM ai_suggestions
  WHERE user_id = p_user_id
    AND is_read = false
    AND is_dismissed = false;
$$;
