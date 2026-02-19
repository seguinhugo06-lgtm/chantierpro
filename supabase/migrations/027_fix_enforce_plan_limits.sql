-- ============================================================================
-- 027_fix_enforce_plan_limits.sql
-- HOTFIX: Fix enforce_plan_limit() trigger crashing on tables without 'type' column
--
-- BUG: Line "IF v_resource = 'devis' AND NEW.type = 'facture' THEN" crashes
--       on clients and catalogue tables which have no 'type' column.
-- FIX: Only check NEW.type when TG_TABLE_NAME = 'devis'
--
-- ALSO: get_user_plan() now handles missing subscriptions table gracefully
-- ============================================================================

-- ─── Fix get_user_plan to handle missing subscriptions table ────────────────

CREATE OR REPLACE FUNCTION get_user_plan(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_plan TEXT;
BEGIN
  -- Wrap in exception handler in case subscriptions table doesn't exist
  BEGIN
    SELECT plan INTO v_plan
    FROM subscriptions
    WHERE user_id = p_user_id
      AND status IN ('active', 'trialing')
    ORDER BY created_at DESC
    LIMIT 1;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_plan := NULL;
  END;

  RETURN COALESCE(v_plan, 'gratuit');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ─── Fix enforce_plan_limit to only check NEW.type on devis table ───────────

CREATE OR REPLACE FUNCTION enforce_plan_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_plan TEXT;
  v_resource TEXT;
  v_limit INTEGER;
  v_current INTEGER;
BEGIN
  -- Determine resource type from table name
  v_resource := TG_TABLE_NAME;

  -- Get user's plan (returns 'gratuit' if subscriptions table missing)
  v_plan := get_user_plan(NEW.user_id);

  -- Get limit for this resource
  v_limit := get_plan_limit(v_plan, v_resource);

  -- -1 means unlimited
  IF v_limit = -1 THEN
    RETURN NEW;
  END IF;

  -- 0 means completely blocked
  IF v_limit = 0 THEN
    RAISE EXCEPTION 'Limite du plan atteinte : cette fonctionnalité nécessite un plan supérieur'
      USING HINT = 'upgrade_required',
            ERRCODE = 'P0001';
  END IF;

  -- Special case for devis table ONLY: allow factures through without counting
  -- IMPORTANT: Only check NEW.type on the devis table (other tables may not have this column)
  IF v_resource = 'devis' THEN
    BEGIN
      IF NEW.type IS NOT NULL AND NEW.type != 'devis' THEN
        RETURN NEW; -- Factures, avoirs, etc. are not limited
      END IF;
    EXCEPTION WHEN undefined_column THEN
      -- Column doesn't exist, skip this check
      NULL;
    END;
  END IF;

  -- Count current resources
  v_current := count_user_resource(NEW.user_id, v_resource);

  -- Check limit
  IF v_current >= v_limit THEN
    RAISE EXCEPTION 'Limite du plan % atteinte pour % : %/% utilisés. Passez au plan Pro pour continuer.',
      v_plan, v_resource, v_current, v_limit
      USING HINT = 'plan_limit_reached',
            ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─── Verification ───────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'Migration 027 - Fixed enforce_plan_limit trigger (NEW.type bug)';
END $$;
