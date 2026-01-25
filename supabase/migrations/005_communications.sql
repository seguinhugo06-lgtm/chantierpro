-- ============================================================================
-- MIGRATION: Communications system for SMS/Email
-- Version: 005
-- Date: 2026-01-24
-- Description: Add client_communications table and notification tracking
-- ============================================================================

-- ============================================================================
-- CLIENT_COMMUNICATIONS TABLE (Log all SMS/Emails)
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  to_address TEXT NOT NULL,
  subject TEXT,
  content TEXT,
  status TEXT DEFAULT 'pending',
  provider_id TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_comm_type CHECK (type IN ('sms', 'email')),
  CONSTRAINT valid_comm_status CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'bounced'))
);

-- Comments
COMMENT ON TABLE client_communications IS 'Log of all SMS and email communications sent to clients';
COMMENT ON COLUMN client_communications.provider_id IS 'Message ID from Twilio (SMS) or SendGrid (Email)';
COMMENT ON COLUMN client_communications.metadata IS 'Additional data like template used, variables, etc.';

-- ============================================================================
-- INDEXES FOR CLIENT_COMMUNICATIONS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_client_communications_user_id
ON client_communications(user_id);

CREATE INDEX IF NOT EXISTS idx_client_communications_client_id
ON client_communications(client_id);

CREATE INDEX IF NOT EXISTS idx_client_communications_type
ON client_communications(type);

CREATE INDEX IF NOT EXISTS idx_client_communications_status
ON client_communications(status);

CREATE INDEX IF NOT EXISTS idx_client_communications_created_at
ON client_communications(created_at DESC);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_client_communications_client_recent
ON client_communications(client_id, created_at DESC);

-- ============================================================================
-- RLS FOR CLIENT_COMMUNICATIONS
-- ============================================================================

ALTER TABLE client_communications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own communications" ON client_communications;
DROP POLICY IF EXISTS "Users can create own communications" ON client_communications;
DROP POLICY IF EXISTS "Users can update own communications" ON client_communications;

CREATE POLICY "Users can view own communications"
ON client_communications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create own communications"
ON client_communications FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own communications"
ON client_communications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- ADD NOTIFICATION FIELDS TO DEVIS TABLE
-- ============================================================================

ALTER TABLE devis
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE;

ALTER TABLE devis
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN devis.notification_sent IS 'Whether client notification was sent for this devis/facture';
COMMENT ON COLUMN devis.notification_sent_at IS 'When the notification was sent';

-- Index for finding un-notified devis
CREATE INDEX IF NOT EXISTS idx_devis_notification_pending
ON devis(notification_sent, statut)
WHERE notification_sent = FALSE;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get recent communications for a client
CREATE OR REPLACE FUNCTION get_client_communications(
  p_client_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  to_address TEXT,
  subject TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id,
    cc.type,
    cc.to_address,
    cc.subject,
    cc.status,
    cc.created_at
  FROM client_communications cc
  WHERE cc.client_id = p_client_id
    AND cc.user_id = auth.uid()
  ORDER BY cc.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Function to get communication stats
CREATE OR REPLACE FUNCTION get_communication_stats(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  type TEXT,
  total BIGINT,
  sent BIGINT,
  failed BIGINT,
  success_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.type,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE cc.status = 'sent') AS sent,
    COUNT(*) FILTER (WHERE cc.status = 'failed') AS failed,
    ROUND(
      COUNT(*) FILTER (WHERE cc.status = 'sent')::NUMERIC /
      NULLIF(COUNT(*), 0) * 100,
      1
    ) AS success_rate
  FROM client_communications cc
  WHERE cc.user_id = p_user_id
    AND cc.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY cc.type;
END;
$$;

-- ============================================================================
-- TRIGGER: Update updated_at
-- ============================================================================

DROP TRIGGER IF EXISTS update_client_communications_updated_at ON client_communications;
CREATE TRIGGER update_client_communications_updated_at
  BEFORE UPDATE ON client_communications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_client_communications TO authenticated;
GRANT EXECUTE ON FUNCTION get_communication_stats TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'client_communications'
  ) THEN
    RAISE EXCEPTION 'Table client_communications was not created';
  END IF;

  RAISE NOTICE 'Migration 005 (communications) completed successfully';
END $$;
