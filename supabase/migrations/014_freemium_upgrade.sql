-- ============================================================================
-- MIGRATION: Upgrade Freemium System — 4 plans with usage tracking
-- Version: 014
-- Date: 2026-02-07
-- Description: Extends subscriptions to 4-tier freemium (Découverte, Artisan,
--   Pro, Entreprise) with plans catalog, usage_tracking, and trial support.
-- ============================================================================

-- ============================================================================
-- 1. PLANS CATALOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL DEFAULT 0,       -- cents EUR
  price_yearly INTEGER NOT NULL DEFAULT 0,        -- cents EUR
  stripe_price_monthly TEXT,                       -- Stripe price ID
  stripe_price_yearly TEXT,                        -- Stripe price ID
  limits JSONB NOT NULL DEFAULT '{}',
  features JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE plans IS 'Subscription plan catalog with Stripe price IDs and feature limits';

-- ============================================================================
-- 2. SEED PLANS
-- ============================================================================

INSERT INTO plans (id, name, description, price_monthly, price_yearly, limits, features, display_order) VALUES
(
  'decouverte',
  'Découverte',
  'Pour démarrer gratuitement',
  0, 0,
  '{"devis": 5, "clients": 10, "chantiers": 3, "photos": 50, "storage_mb": 100, "equipe": 0}',
  '["devis_basic", "clients_basic", "chantiers_basic", "catalogue"]',
  1
),
(
  'artisan',
  'Artisan',
  'Pour les artisans indépendants',
  2900, 27840,
  '{"devis": -1, "clients": -1, "chantiers": -1, "photos": 500, "storage_mb": 2048, "equipe": 3}',
  '["devis_basic", "clients_basic", "chantiers_basic", "catalogue", "planning", "signatures", "export_comptable", "rapports_pdf", "relances", "portal_client"]',
  2
),
(
  'pro',
  'Pro',
  'Pour les entreprises en croissance',
  5900, 56640,
  '{"devis": -1, "clients": -1, "chantiers": -1, "photos": -1, "storage_mb": 10240, "equipe": 15}',
  '["devis_basic", "clients_basic", "chantiers_basic", "catalogue", "planning", "signatures", "export_comptable", "rapports_pdf", "relances", "portal_client", "tresorerie", "ia_devis", "sous_traitants", "commandes", "entretien", "analytics"]',
  3
),
(
  'entreprise',
  'Entreprise',
  'Pour les grandes structures',
  11900, 114240,
  '{"devis": -1, "clients": -1, "chantiers": -1, "photos": -1, "storage_mb": -1, "equipe": -1}',
  '["devis_basic", "clients_basic", "chantiers_basic", "catalogue", "planning", "signatures", "export_comptable", "rapports_pdf", "relances", "portal_client", "tresorerie", "ia_devis", "sous_traitants", "commandes", "entretien", "analytics", "api_access", "priority_support", "multi_entreprise", "custom_branding"]',
  4
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  limits = EXCLUDED.limits,
  features = EXCLUDED.features,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- ============================================================================
-- 3. ALTER SUBSCRIPTIONS TABLE — expand plan constraint & add fields
-- ============================================================================

-- Drop old plan constraint and add new one with 4 tiers
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS valid_plan;
ALTER TABLE subscriptions ADD CONSTRAINT valid_plan
  CHECK (plan IN ('free', 'solo', 'decouverte', 'artisan', 'pro', 'entreprise'));

-- Migrate old plan names → new ones
UPDATE subscriptions SET plan = 'decouverte' WHERE plan = 'free';
UPDATE subscriptions SET plan = 'artisan' WHERE plan = 'solo';

-- Add billing_interval column if missing
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_interval TEXT DEFAULT 'monthly';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- ============================================================================
-- 4. USAGE TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  period_start DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::DATE,
  period_end DATE NOT NULL DEFAULT (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE,
  devis_count INTEGER DEFAULT 0,
  clients_count INTEGER DEFAULT 0,
  chantiers_count INTEGER DEFAULT 0,
  photos_count INTEGER DEFAULT 0,
  storage_used_mb NUMERIC(10,2) DEFAULT 0,
  equipe_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period_start)
);

COMMENT ON TABLE usage_tracking IS 'Monthly usage counters per user for plan limit enforcement';

CREATE INDEX IF NOT EXISTS idx_usage_user_period
ON usage_tracking(user_id, period_start DESC);

-- RLS
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own usage" ON usage_tracking;
CREATE POLICY "Users view own usage"
ON usage_tracking FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own usage" ON usage_tracking;
CREATE POLICY "Users update own usage"
ON usage_tracking FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS for plans (public read)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read plans" ON plans;
CREATE POLICY "Anyone can read plans"
ON plans FOR SELECT
TO authenticated, anon
USING (is_active = TRUE);

-- ============================================================================
-- 5. FUNCTION: increment usage counter
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_resource TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO usage_tracking (user_id, period_start, period_end)
  VALUES (
    p_user_id,
    date_trunc('month', CURRENT_DATE)::DATE,
    (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE
  )
  ON CONFLICT (user_id, period_start) DO NOTHING;

  EXECUTE format(
    'UPDATE usage_tracking SET %I = %I + $1, updated_at = NOW()
     WHERE user_id = $2 AND period_start = date_trunc(''month'', CURRENT_DATE)::DATE',
    p_resource || '_count', p_resource || '_count'
  ) USING p_amount, p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_usage TO authenticated;

-- ============================================================================
-- 6. UPDATE get_user_plan for new plan names
-- ============================================================================

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

  RETURN COALESCE(v_plan, 'decouverte');
END;
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'plans'
  ) THEN
    RAISE EXCEPTION 'Table plans was not created';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'usage_tracking'
  ) THEN
    RAISE EXCEPTION 'Table usage_tracking was not created';
  END IF;
  RAISE NOTICE 'Migration 014 (freemium upgrade) completed successfully';
END $$;
