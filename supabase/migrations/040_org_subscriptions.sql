-- ============================================================================
-- MIGRATION 040: Organization-level subscriptions
-- Add organization_id to subscriptions table for org-level billing
-- ============================================================================

-- Add organization_id column (nullable for backward compatibility)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'organization_id') THEN
      ALTER TABLE subscriptions ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
    END IF;
  END IF;
END $$;

-- Backfill: link existing subscriptions to their user's org
DO $$
DECLARE
  r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
    FOR r IN
      SELECT s.id, s.user_id, om.organization_id
      FROM subscriptions s
      JOIN organization_members om ON om.user_id = s.user_id AND om.role = 'owner'
      WHERE s.organization_id IS NULL
    LOOP
      UPDATE subscriptions SET organization_id = r.organization_id WHERE id = r.id;
    END LOOP;
  END IF;
END $$;

-- Function to get org subscription (checks org first, falls back to user)
CREATE OR REPLACE FUNCTION get_org_subscription(p_org_id UUID, p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_sub RECORD;
BEGIN
  -- Try org-level subscription first
  SELECT * INTO v_sub
  FROM subscriptions
  WHERE organization_id = p_org_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN row_to_json(v_sub);
  END IF;

  -- Fallback to user-level subscription
  SELECT * INTO v_sub
  FROM subscriptions
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN row_to_json(v_sub);
  END IF;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION get_org_subscription TO authenticated;
