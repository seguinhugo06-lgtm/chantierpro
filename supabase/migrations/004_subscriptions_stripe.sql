-- ============================================================================
-- MIGRATION: Subscriptions table for Stripe integration
-- Version: 004
-- Date: 2026-01-24
-- Description: Manage user subscription plans (free, solo, pro)
-- ============================================================================

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'free',
  status TEXT DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_plan CHECK (plan IN ('free', 'solo', 'pro')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete'))
);

-- Add comment for documentation
COMMENT ON TABLE subscriptions IS 'User subscription plans managed via Stripe';
COMMENT ON COLUMN subscriptions.plan IS 'Subscription tier: free (default), solo, pro';
COMMENT ON COLUMN subscriptions.status IS 'Stripe subscription status';
COMMENT ON COLUMN subscriptions.current_period_end IS 'When the current billing period ends';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_user
ON subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer
ON subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status
ON subscriptions(status);

-- Index for finding expiring subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end
ON subscriptions(current_period_end)
WHERE status = 'active';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users view own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users insert own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users update own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Service role full access" ON subscriptions;

-- User policies
CREATE POLICY "Users view own subscription"
ON subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own subscription"
ON subscriptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own subscription"
ON subscriptions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Service role for Stripe webhooks (bypasses RLS by default)
-- No explicit policy needed - service_role has full access

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's current plan
CREATE OR REPLACE FUNCTION get_user_plan(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan TEXT;
BEGIN
  SELECT plan INTO v_plan
  FROM subscriptions
  WHERE user_id = p_user_id
    AND status IN ('active', 'trialing')
  LIMIT 1;

  RETURN COALESCE(v_plan, 'free');
END;
$$;

-- Function to check if user has access to a feature
CREATE OR REPLACE FUNCTION has_feature_access(
  p_user_id UUID,
  p_feature TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan TEXT;
BEGIN
  v_plan := get_user_plan(p_user_id);

  -- Feature matrix
  RETURN CASE p_feature
    -- Free features
    WHEN 'basic_devis' THEN TRUE
    WHEN 'max_clients_10' THEN TRUE

    -- Solo features
    WHEN 'unlimited_clients' THEN v_plan IN ('solo', 'pro')
    WHEN 'photo_reports' THEN v_plan IN ('solo', 'pro')
    WHEN 'reminders' THEN v_plan IN ('solo', 'pro')

    -- Pro features
    WHEN 'team_members' THEN v_plan = 'pro'
    WHEN 'analytics' THEN v_plan = 'pro'
    WHEN 'api_access' THEN v_plan = 'pro'
    WHEN 'priority_support' THEN v_plan = 'pro'

    ELSE FALSE
  END;
END;
$$;

-- Function to check plan limits
CREATE OR REPLACE FUNCTION check_plan_limit(
  p_user_id UUID,
  p_resource TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan TEXT;
  v_current_count INTEGER;
  v_limit INTEGER;
BEGIN
  v_plan := get_user_plan(p_user_id);

  -- Get current count based on resource
  CASE p_resource
    WHEN 'clients' THEN
      SELECT COUNT(*) INTO v_current_count FROM clients WHERE user_id = p_user_id;
      v_limit := CASE v_plan WHEN 'free' THEN 10 ELSE NULL END;
    WHEN 'devis_per_month' THEN
      SELECT COUNT(*) INTO v_current_count FROM devis
      WHERE user_id = p_user_id
        AND created_at >= date_trunc('month', CURRENT_DATE);
      v_limit := CASE v_plan WHEN 'free' THEN 5 ELSE NULL END;
    WHEN 'team_members' THEN
      SELECT COUNT(*) INTO v_current_count FROM equipe WHERE user_id = p_user_id;
      v_limit := CASE v_plan WHEN 'free' THEN 0 WHEN 'solo' THEN 0 ELSE NULL END;
    WHEN 'storage_mb' THEN
      SELECT COALESCE(SUM(file_size), 0) / (1024 * 1024) INTO v_current_count
      FROM chantier_photos WHERE user_id = p_user_id;
      v_limit := CASE v_plan WHEN 'free' THEN 100 WHEN 'solo' THEN 1000 ELSE 10000 END;
    ELSE
      v_current_count := 0;
      v_limit := NULL;
  END CASE;

  RETURN jsonb_build_object(
    'resource', p_resource,
    'current', v_current_count,
    'limit', v_limit,
    'allowed', (v_limit IS NULL OR v_current_count < v_limit),
    'plan', v_plan
  );
END;
$$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_timestamp();

-- ============================================================================
-- AUTO-CREATE SUBSCRIPTION ON USER SIGNUP
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users (requires superuser, run in dashboard)
-- DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
-- CREATE TRIGGER on_auth_user_created_subscription
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION handle_new_user_subscription();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_user_plan TO authenticated;
GRANT EXECUTE ON FUNCTION has_feature_access TO authenticated;
GRANT EXECUTE ON FUNCTION check_plan_limit TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'subscriptions'
  ) THEN
    RAISE EXCEPTION 'Table subscriptions was not created';
  END IF;

  RAISE NOTICE 'Migration 004 (subscriptions) completed successfully';
END $$;
