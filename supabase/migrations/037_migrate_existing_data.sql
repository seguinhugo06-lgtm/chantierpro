-- ============================================================================
-- MIGRATION 037: Backfill organization_id for ALL existing data
-- Creates one org per existing user, sets them as owner, populates org_id
-- IDEMPOTENT: Safe to re-run
-- ============================================================================

-- 1. Create an organization for every existing user who has data
-- Uses entreprise name if available, falls back to email
INSERT INTO organizations (id, name, slug, owner_id, created_at)
SELECT
  gen_random_uuid(),
  COALESCE(
    e.settings_json->>'nom',
    split_part(u.email, '@', 1),
    'Mon Entreprise'
  ),
  -- Generate unique slug
  LOWER(REGEXP_REPLACE(
    COALESCE(
      e.settings_json->>'nom',
      split_part(u.email, '@', 1),
      'entreprise'
    ),
    '[^a-z0-9]', '-', 'g'
  )) || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8),
  u.id,
  NOW()
FROM auth.users u
LEFT JOIN entreprise e ON e.user_id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM organizations o WHERE o.owner_id = u.id
)
ON CONFLICT DO NOTHING;

-- 2. Make each user an owner-member of their org
INSERT INTO organization_members (organization_id, user_id, role, joined_at)
SELECT o.id, o.owner_id, 'owner', NOW()
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.organization_id = o.id AND om.user_id = o.owner_id
)
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- 3. Backfill organization_id on ALL existing data tables
-- Uses a dynamic approach to handle all tables safely
DO $$
DECLARE
  tables_to_update TEXT[] := ARRAY[
    'clients', 'chantiers', 'devis', 'chantier_photos',
    'depenses', 'equipe', 'pointages', 'catalogue',
    'entreprise', 'events', 'ai_suggestions',
    'subscriptions', 'client_communications', 'events_log',
    'stock_mouvements', 'equipes',
    'document_counters', 'email_logs',
    'fournisseurs', 'fournisseur_articles', 'packs', 'pack_items',
    'catalogue_coefficients', 'tresorerie_previsions', 'tresorerie_settings',
    'reglements', 'tresorerie_mouvements', 'planning_events',
    'sous_traitants', 'gocardless_config', 'bank_connections',
    'bank_transactions', 'bank_reconciliation_log', 'stripe_config',
    'usage_tracking', 'ouvrages', 'paiements', 'echanges',
    'ajustements', 'memos',
    'factures_electroniques', 'relance_history', 'score_sante_history',
    'situations_travaux', 'rapports_chantier', 'commandes_fournisseurs',
    'ia_analyses', 'carnets_entretien', 'entretien_taches', 'signatures'
  ];
  t TEXT;
  row_count INTEGER;
BEGIN
  FOREACH t IN ARRAY tables_to_update
  LOOP
    -- Only update if table exists AND has both columns
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'organization_id'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'user_id'
    ) THEN
      EXECUTE format(
        'UPDATE %I t SET organization_id = o.id
         FROM organizations o
         WHERE t.user_id = o.owner_id
           AND t.organization_id IS NULL',
        t
      );
      GET DIAGNOSTICS row_count = ROW_COUNT;
      IF row_count > 0 THEN
        RAISE NOTICE 'Updated % rows in %', row_count, t;
      END IF;
    ELSE
      RAISE NOTICE 'Skipping % (table or columns missing)', t;
    END IF;
  END LOOP;
END $$;

-- 4. Verify migration completeness
DO $$
DECLARE
  t TEXT;
  null_count INTEGER;
  tables_to_check TEXT[] := ARRAY[
    'clients', 'chantiers', 'devis', 'depenses', 'equipe',
    'pointages', 'catalogue', 'entreprise'
  ];
BEGIN
  FOREACH t IN ARRAY tables_to_check
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'organization_id'
    ) THEN
      EXECUTE format('SELECT COUNT(*) FROM %I WHERE organization_id IS NULL AND user_id IS NOT NULL', t)
      INTO null_count;
      IF null_count > 0 THEN
        RAISE WARNING '⚠️ % has % rows with NULL organization_id', t, null_count;
      ELSE
        RAISE NOTICE '✅ % fully migrated', t;
      END IF;
    END IF;
  END LOOP;
END $$;
