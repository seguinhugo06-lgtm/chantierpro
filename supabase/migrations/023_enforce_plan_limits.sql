-- ============================================================================
-- 023_enforce_plan_limits.sql
-- Server-side plan limit enforcement via PostgreSQL functions + triggers
--
-- Free plan limits: 5 devis/month, 10 clients, 2 chantiers, 20 catalogue, 0 equipe
-- Pro plan: unlimited (-1)
-- ============================================================================

-- ─── Helper function: get user's current plan ─────────────────────────────────

CREATE OR REPLACE FUNCTION get_user_plan(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_plan TEXT;
BEGIN
  SELECT plan INTO v_plan
  FROM subscriptions
  WHERE user_id = p_user_id
    AND status IN ('active', 'trialing')
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN COALESCE(v_plan, 'gratuit');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ─── Helper function: count user's resources ──────────────────────────────────

CREATE OR REPLACE FUNCTION count_user_resource(p_user_id UUID, p_resource TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_month_start DATE;
BEGIN
  v_month_start := date_trunc('month', CURRENT_DATE)::DATE;

  CASE p_resource
    WHEN 'devis' THEN
      -- Count devis (not factures) created this month
      SELECT COUNT(*) INTO v_count
      FROM devis
      WHERE user_id = p_user_id
        AND (type IS NULL OR type = 'devis')
        AND created_at >= v_month_start;

    WHEN 'clients' THEN
      SELECT COUNT(*) INTO v_count
      FROM clients
      WHERE user_id = p_user_id;

    WHEN 'chantiers' THEN
      SELECT COUNT(*) INTO v_count
      FROM chantiers
      WHERE user_id = p_user_id;

    WHEN 'catalogue' THEN
      SELECT COUNT(*) INTO v_count
      FROM catalogue
      WHERE user_id = p_user_id;

    WHEN 'equipe' THEN
      SELECT COUNT(*) INTO v_count
      FROM equipe
      WHERE user_id = p_user_id;

    ELSE
      v_count := 0;
  END CASE;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ─── Helper function: get plan limit for a resource ───────────────────────────

CREATE OR REPLACE FUNCTION get_plan_limit(p_plan TEXT, p_resource TEXT)
RETURNS INTEGER AS $$
BEGIN
  -- Plan limits (mirrors subscriptionStore.js PLANS)
  -- -1 = unlimited
  CASE p_plan
    WHEN 'pro' THEN
      CASE p_resource
        WHEN 'devis' THEN RETURN -1;
        WHEN 'clients' THEN RETURN -1;
        WHEN 'chantiers' THEN RETURN -1;
        WHEN 'catalogue' THEN RETURN -1;
        WHEN 'equipe' THEN RETURN 5;
        ELSE RETURN -1;
      END CASE;

    ELSE -- 'gratuit' or unknown → free plan limits
      CASE p_resource
        WHEN 'devis' THEN RETURN 5;
        WHEN 'clients' THEN RETURN 10;
        WHEN 'chantiers' THEN RETURN 2;
        WHEN 'catalogue' THEN RETURN 20;
        WHEN 'equipe' THEN RETURN 0;
        ELSE RETURN 0;
      END CASE;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ─── Main enforcement function ────────────────────────────────────────────────

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

  -- Get user's plan
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
      NULL; -- Column doesn't exist, skip
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


-- ─── Apply triggers to relevant tables ────────────────────────────────────────

-- Drop existing triggers if any (idempotent)
DROP TRIGGER IF EXISTS enforce_plan_limit_clients ON clients;
DROP TRIGGER IF EXISTS enforce_plan_limit_devis ON devis;
DROP TRIGGER IF EXISTS enforce_plan_limit_chantiers ON chantiers;
DROP TRIGGER IF EXISTS enforce_plan_limit_catalogue ON catalogue;
DROP TRIGGER IF EXISTS enforce_plan_limit_equipe ON equipe;

-- Create BEFORE INSERT triggers (only on INSERT, not UPDATE)
CREATE TRIGGER enforce_plan_limit_clients
  BEFORE INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION enforce_plan_limit();

CREATE TRIGGER enforce_plan_limit_devis
  BEFORE INSERT ON devis
  FOR EACH ROW
  EXECUTE FUNCTION enforce_plan_limit();

CREATE TRIGGER enforce_plan_limit_chantiers
  BEFORE INSERT ON chantiers
  FOR EACH ROW
  EXECUTE FUNCTION enforce_plan_limit();

CREATE TRIGGER enforce_plan_limit_catalogue
  BEFORE INSERT ON catalogue
  FOR EACH ROW
  EXECUTE FUNCTION enforce_plan_limit();

CREATE TRIGGER enforce_plan_limit_equipe
  BEFORE INSERT ON equipe
  FOR EACH ROW
  EXECUTE FUNCTION enforce_plan_limit();


-- ─── Verification query (run manually to test) ───────────────────────────────
-- SELECT get_user_plan('your-user-id');
-- SELECT count_user_resource('your-user-id', 'clients');
-- SELECT get_plan_limit('gratuit', 'clients');
