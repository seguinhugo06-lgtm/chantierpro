-- ============================================================================
-- Migration 054: Sync plan names between DB and frontend
-- ============================================================================
-- The frontend uses: gratuit / artisan / equipe (3 plans)
-- The DB seed (014) used: decouverte / artisan / pro / entreprise (4 plans)
-- This migration aligns DB to frontend naming convention.
-- ============================================================================

-- 1. Update plan names in the plans table
-- Rename 'decouverte' → 'gratuit'
UPDATE plans SET
  id = 'gratuit',
  name = 'Gratuit',
  description = 'Pour découvrir BatiGesti',
  price_monthly = 0,
  price_yearly = 0,
  limits = '{"devis": 5, "clients": 10, "chantiers": 2, "catalogue": 30, "signatures": 0, "ia_analyses": 3, "photos": 50, "storage_mb": 100, "equipe": 1}'::jsonb,
  features = '["devis_basic", "clients_basic", "chantiers_basic", "catalogue", "planning", "ia_devis", "taches"]'::jsonb,
  display_order = 1,
  updated_at = NOW()
WHERE id = 'decouverte';

-- Update 'artisan' pricing to match frontend (14.90€/month = 1490 cents, 149€/year = 14900 cents)
UPDATE plans SET
  name = 'Artisan',
  description = 'L''essentiel pour un artisan autonome',
  price_monthly = 1490,
  price_yearly = 14900,
  limits = '{"devis": -1, "clients": -1, "chantiers": -1, "catalogue": -1, "signatures": -1, "ia_analyses": 20, "photos": -1, "storage_mb": 2048, "equipe": 1}'::jsonb,
  features = '["devis_basic", "clients_basic", "chantiers_basic", "catalogue", "planning", "ia_devis", "taches", "signatures", "export_comptable", "rapports_pdf", "relances", "marges", "pipeline", "photos_gps", "carte_chantiers", "avis_google", "entretien"]'::jsonb,
  display_order = 2,
  updated_at = NOW()
WHERE id = 'artisan';

-- Rename 'pro' → 'equipe'
UPDATE plans SET
  id = 'equipe',
  name = 'Équipe',
  description = 'Pour les entreprises avec collaborateurs',
  price_monthly = 2990,
  price_yearly = 29900,
  limits = '{"devis": -1, "clients": -1, "chantiers": -1, "catalogue": -1, "signatures": -1, "ia_analyses": -1, "photos": -1, "storage_mb": 10240, "equipe": 10}'::jsonb,
  features = '["devis_basic", "clients_basic", "chantiers_basic", "catalogue", "planning", "ia_devis", "taches", "signatures", "export_comptable", "rapports_pdf", "relances", "marges", "pipeline", "photos_gps", "carte_chantiers", "avis_google", "entretien", "pointages", "rbac", "tresorerie", "fec_export", "rapprochement_bancaire", "sous_traitants", "commandes", "portal_client", "alertes_stock", "analytics"]'::jsonb,
  display_order = 3,
  updated_at = NOW()
WHERE id = 'pro';

-- Remove 'entreprise' plan (merged into equipe or not offered yet)
DELETE FROM plans WHERE id = 'entreprise';

-- 2. Migrate subscription records to new plan names
UPDATE subscriptions SET plan = 'gratuit' WHERE plan IN ('decouverte', 'free');
UPDATE subscriptions SET plan = 'equipe' WHERE plan IN ('pro', 'entreprise');
-- 'artisan' stays as-is since it's the same in both schemas

-- 3. Update the plan constraint on subscriptions table
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS valid_plan;
ALTER TABLE subscriptions ADD CONSTRAINT valid_plan
  CHECK (plan IN ('gratuit', 'artisan', 'equipe'));

-- 4. Update plan limit enforcement function to use new plan names
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

-- 5. Insert plans with correct IDs if they don't exist yet (idempotent)
INSERT INTO plans (id, name, description, price_monthly, price_yearly, limits, features, display_order)
VALUES
  ('gratuit', 'Gratuit', 'Pour découvrir BatiGesti', 0, 0,
   '{"devis": 5, "clients": 10, "chantiers": 2, "catalogue": 30, "signatures": 0, "ia_analyses": 3, "photos": 50, "storage_mb": 100, "equipe": 1}',
   '["devis_basic", "clients_basic", "chantiers_basic", "catalogue", "planning", "ia_devis", "taches"]', 1),
  ('artisan', 'Artisan', 'L''essentiel pour un artisan autonome', 1490, 14900,
   '{"devis": -1, "clients": -1, "chantiers": -1, "catalogue": -1, "signatures": -1, "ia_analyses": 20, "photos": -1, "storage_mb": 2048, "equipe": 1}',
   '["devis_basic", "clients_basic", "chantiers_basic", "catalogue", "planning", "ia_devis", "taches", "signatures", "export_comptable", "rapports_pdf", "relances", "marges", "pipeline", "photos_gps", "carte_chantiers", "avis_google", "entretien"]', 2),
  ('equipe', 'Équipe', 'Pour les entreprises avec collaborateurs', 2990, 29900,
   '{"devis": -1, "clients": -1, "chantiers": -1, "catalogue": -1, "signatures": -1, "ia_analyses": -1, "photos": -1, "storage_mb": 10240, "equipe": 10}',
   '["devis_basic", "clients_basic", "chantiers_basic", "catalogue", "planning", "ia_devis", "taches", "signatures", "export_comptable", "rapports_pdf", "relances", "marges", "pipeline", "photos_gps", "carte_chantiers", "avis_google", "entretien", "pointages", "rbac", "tresorerie", "fec_export", "rapprochement_bancaire", "sous_traitants", "commandes", "portal_client", "alertes_stock", "analytics"]', 3)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  limits = EXCLUDED.limits,
  features = EXCLUDED.features,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();
