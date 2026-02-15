-- Migration: Create planning_events table for user calendar events
-- These are custom events (RDV, relance, urgence, autre) distinct from chantier dates

CREATE TABLE IF NOT EXISTS planning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME DEFAULT NULL,
  type TEXT NOT NULL DEFAULT 'rdv',
  employe_id TEXT DEFAULT NULL,
  client_id TEXT DEFAULT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS idx_planning_events_user ON planning_events(user_id);
CREATE INDEX IF NOT EXISTS idx_planning_events_date ON planning_events(user_id, date);

-- RLS policies
ALTER TABLE planning_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own planning events"
  ON planning_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own planning events"
  ON planning_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own planning events"
  ON planning_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own planning events"
  ON planning_events FOR DELETE
  USING (auth.uid() = user_id);
