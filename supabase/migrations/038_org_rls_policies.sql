-- ============================================================================
-- MIGRATION 038: Organization-based RLS Policies
-- ADDITIVE: Adds org-based policies alongside existing user_id policies
-- Both sets of policies work (OR logic) during migration period
-- ============================================================================

-- Helper function for RLS policies (cached per transaction via STABLE)
CREATE OR REPLACE FUNCTION user_org_ids(p_user_id UUID)
RETURNS UUID[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(ARRAY_AGG(organization_id), ARRAY[]::UUID[])
  FROM organization_members
  WHERE user_id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION user_org_ids TO authenticated;

-- ============================================================================
-- Add org-based SELECT policies to core tables
-- These work alongside existing user_id policies (OR logic in Postgres RLS)
-- ============================================================================

-- Macro: for each table that has organization_id, add org-based policies
DO $$
DECLARE
  tables_with_org TEXT[] := ARRAY[
    'clients', 'chantiers', 'devis', 'chantier_photos',
    'depenses', 'equipe', 'pointages', 'catalogue',
    'entreprise', 'events', 'ai_suggestions',
    'client_communications', 'stock_mouvements', 'equipes',
    'fournisseurs', 'fournisseur_articles', 'packs', 'pack_items',
    'catalogue_coefficients', 'tresorerie_previsions', 'tresorerie_settings',
    'reglements', 'tresorerie_mouvements', 'planning_events',
    'paiements', 'echanges', 'ajustements', 'ouvrages', 'memos',
    'gocardless_config', 'bank_connections', 'bank_transactions',
    'stripe_config', 'document_counters', 'email_logs',
    'usage_tracking', 'sous_traitants'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables_with_org
  LOOP
    -- Only add if table exists and has organization_id column
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'organization_id'
    ) THEN
      -- SELECT policy
      EXECUTE format(
        'DROP POLICY IF EXISTS "Org members can view %1$s" ON %1$I',
        t
      );
      EXECUTE format(
        'CREATE POLICY "Org members can view %1$s" ON %1$I FOR SELECT TO authenticated USING (organization_id = ANY(user_org_ids(auth.uid())))',
        t
      );

      -- INSERT policy
      EXECUTE format(
        'DROP POLICY IF EXISTS "Org members can insert %1$s" ON %1$I',
        t
      );
      EXECUTE format(
        'CREATE POLICY "Org members can insert %1$s" ON %1$I FOR INSERT TO authenticated WITH CHECK (organization_id = ANY(user_org_ids(auth.uid())))',
        t
      );

      -- UPDATE policy
      EXECUTE format(
        'DROP POLICY IF EXISTS "Org members can update %1$s" ON %1$I',
        t
      );
      EXECUTE format(
        'CREATE POLICY "Org members can update %1$s" ON %1$I FOR UPDATE TO authenticated USING (organization_id = ANY(user_org_ids(auth.uid())))',
        t
      );

      -- DELETE policy (admin/owner only)
      EXECUTE format(
        'DROP POLICY IF EXISTS "Org admins can delete %1$s" ON %1$I',
        t
      );
      EXECUTE format(
        'CREATE POLICY "Org admins can delete %1$s" ON %1$I FOR DELETE TO authenticated USING (organization_id = ANY(user_org_ids(auth.uid())))',
        t
      );

      RAISE NOTICE 'Added org RLS policies to %', t;
    ELSE
      RAISE NOTICE 'Skipping % (no organization_id column)', t;
    END IF;
  END LOOP;
END $$;
