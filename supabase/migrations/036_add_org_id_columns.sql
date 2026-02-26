-- ============================================================================
-- MIGRATION 036: Add organization_id to ALL existing tables
-- BACKWARD COMPATIBLE: Column is NULLABLE, existing queries unaffected
-- ============================================================================

-- Comprehensive list of ALL tables with user_id that need organization_id
-- Uses IF NOT EXISTS pattern for safety (idempotent)

DO $$
DECLARE
  tables_to_update TEXT[] := ARRAY[
    -- Core tables (000_create_tables)
    'clients',
    'chantiers',
    'devis',
    'chantier_photos',
    'depenses',
    'equipe',
    'pointages',
    'catalogue',
    'entreprise',
    'events',
    'ai_suggestions',
    -- Subscriptions (004)
    'subscriptions',
    -- Communications (005)
    'client_communications',
    -- Events log (006)
    'events_log',
    -- Stock (008)
    'stock_mouvements',
    -- Equipes/crews (009)
    'equipes',
    -- Document counters (015)
    'document_counters',
    'email_logs',
    -- Catalogue extended (016)
    'fournisseurs',
    'fournisseur_articles',
    'packs',
    'pack_items',
    'catalogue_coefficients',
    -- Tresorerie (017-019)
    'tresorerie_previsions',
    'tresorerie_settings',
    'reglements',
    'tresorerie_mouvements',
    -- Planning (021)
    'planning_events',
    -- Sous-traitants (024)
    'sous_traitants',
    -- Factures situation (026)
    -- Bank (014, 028, 029)
    'gocardless_config',
    'bank_connections',
    'bank_transactions',
    'bank_reconciliation_log',
    'stripe_config',
    -- Usage (014_freemium)
    'usage_tracking',
    -- Ouvrages
    'ouvrages',
    -- Paiements & echanges & ajustements
    'paiements',
    'echanges',
    'ajustements',
    -- Memos
    'memos',
    -- Sprint tables (if they exist)
    'factures_electroniques',
    'relance_history',
    'score_sante_history',
    'situations_travaux',
    'rapports_chantier',
    'commandes_fournisseurs',
    'ia_analyses',
    'carnets_entretien',
    'entretien_taches',
    'signatures'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables_to_update
  LOOP
    -- Only add column if table exists AND column doesn't exist yet
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'organization_id'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE',
        t
      );
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%s_org_id ON %I(organization_id) WHERE organization_id IS NOT NULL',
        t, t
      );
      RAISE NOTICE 'Added organization_id to %', t;
    ELSE
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = t
      ) THEN
        RAISE NOTICE 'Table % does not exist, skipping', t;
      ELSE
        RAISE NOTICE 'Column organization_id already exists on %, skipping', t;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Remove UNIQUE constraint on entreprise.user_id
-- (will be replaced by UNIQUE on organization_id later)
DO $$
BEGIN
  -- Try to drop the constraint (name may vary)
  ALTER TABLE entreprise DROP CONSTRAINT IF EXISTS entreprise_user_id_key;
  ALTER TABLE entreprise DROP CONSTRAINT IF EXISTS entreprise_user_id_unique;
  RAISE NOTICE 'Dropped entreprise user_id unique constraint';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'No entreprise user_id unique constraint to drop';
END $$;
