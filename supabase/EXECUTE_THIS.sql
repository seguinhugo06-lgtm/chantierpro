-- ============================================================================
-- CHANTIERPRO - COMPLETE DATABASE SETUP
-- Copy and paste this entire file into Supabase SQL Editor to set up your database
-- ============================================================================

-- ============================================================================
-- STEP 1: EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- STEP 2: CREATE TABLES
-- ============================================================================

-- CLIENTS TABLE
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT,
  email TEXT,
  telephone TEXT,
  adresse TEXT,
  ville TEXT,
  code_postal TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CHANTIERS TABLE
CREATE TABLE IF NOT EXISTS chantiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  nom TEXT NOT NULL,
  description TEXT,
  adresse TEXT,
  ville TEXT,
  code_postal TEXT,
  statut TEXT DEFAULT 'prospect',
  type TEXT,
  avancement INTEGER DEFAULT 0,
  date_debut DATE,
  date_fin DATE,
  budget_prevu NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DEVIS TABLE
CREATE TABLE IF NOT EXISTS devis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  chantier_id UUID REFERENCES chantiers(id) ON DELETE SET NULL,
  numero TEXT NOT NULL,
  type TEXT DEFAULT 'devis',
  statut TEXT DEFAULT 'brouillon',
  date DATE DEFAULT CURRENT_DATE,
  date_validite DATE,
  objet TEXT,
  lignes JSONB DEFAULT '[]',
  sections JSONB DEFAULT '[]',
  conditions TEXT,
  notes TEXT,
  remise_globale NUMERIC(5,2) DEFAULT 0,
  tva_rate NUMERIC(5,2) DEFAULT 20,
  total_ht NUMERIC(12,2) DEFAULT 0,
  total_tva NUMERIC(12,2) DEFAULT 0,
  total_ttc NUMERIC(12,2) DEFAULT 0,
  acompte_percent NUMERIC(5,2),
  acompte_montant NUMERIC(12,2),
  date_paiement DATE,
  mode_paiement TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DEPENSES TABLE
CREATE TABLE IF NOT EXISTS depenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  chantier_id UUID REFERENCES chantiers(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  montant NUMERIC(12,2) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  categorie TEXT,
  fournisseur TEXT,
  numero_facture TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EQUIPE TABLE
CREATE TABLE IF NOT EXISTS equipe (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT,
  role TEXT,
  email TEXT,
  telephone TEXT,
  taux_horaire NUMERIC(8,2),
  cout_horaire_charge NUMERIC(8,2),
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- POINTAGES TABLE
CREATE TABLE IF NOT EXISTS pointages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  employe_id UUID REFERENCES equipe(id) ON DELETE CASCADE,
  chantier_id UUID REFERENCES chantiers(id) ON DELETE SET NULL,
  date DATE DEFAULT CURRENT_DATE,
  heures NUMERIC(5,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CATALOGUE TABLE
CREATE TABLE IF NOT EXISTS catalogue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  reference TEXT,
  designation TEXT NOT NULL,
  description TEXT,
  unite TEXT DEFAULT 'u',
  prix_unitaire_ht NUMERIC(12,2) NOT NULL,
  prix_achat NUMERIC(12,2),
  tva_rate NUMERIC(5,2) DEFAULT 20,
  categorie TEXT,
  favori BOOLEAN DEFAULT FALSE,
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ENTREPRISE TABLE
CREATE TABLE IF NOT EXISTS entreprise (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users UNIQUE NOT NULL,
  nom TEXT,
  siret TEXT,
  tva_intra TEXT,
  adresse TEXT,
  ville TEXT,
  code_postal TEXT,
  telephone TEXT,
  email TEXT,
  site_web TEXT,
  logo_url TEXT,
  iban TEXT,
  bic TEXT,
  conditions_paiement TEXT,
  mentions_legales TEXT,
  couleur_principale TEXT DEFAULT '#f97316',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EVENTS TABLE
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  chantier_id UUID REFERENCES chantiers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'rdv',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT FALSE,
  color TEXT,
  reminder BOOLEAN DEFAULT FALSE,
  reminder_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: ADD MISSING COLUMNS (for existing tables)
-- ============================================================================
DO $$
BEGIN
  -- Add prenom to clients if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'prenom') THEN
    ALTER TABLE clients ADD COLUMN prenom TEXT;
  END IF;

  -- Add sections to devis if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devis' AND column_name = 'sections') THEN
    ALTER TABLE devis ADD COLUMN sections JSONB DEFAULT '[]';
  END IF;

  -- Add type and avancement to chantiers if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chantiers' AND column_name = 'type') THEN
    ALTER TABLE chantiers ADD COLUMN type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chantiers' AND column_name = 'avancement') THEN
    ALTER TABLE chantiers ADD COLUMN avancement INTEGER DEFAULT 0;
  END IF;
END $$;

-- ============================================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE chantiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE depenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pointages ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE entreprise ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: CREATE RLS POLICIES
-- ============================================================================

-- Helper function to create policies safely
CREATE OR REPLACE FUNCTION create_policy_if_not_exists(
  policy_name TEXT,
  table_name TEXT,
  operation TEXT,
  using_expr TEXT DEFAULT NULL,
  check_expr TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- Drop existing policy if it exists
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, table_name);

  -- Create new policy
  IF operation = 'SELECT' THEN
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (%s)',
                   policy_name, table_name, using_expr);
  ELSIF operation = 'INSERT' THEN
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (%s)',
                   policy_name, table_name, check_expr);
  ELSIF operation = 'UPDATE' THEN
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
                   policy_name, table_name, using_expr, check_expr);
  ELSIF operation = 'DELETE' THEN
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE TO authenticated USING (%s)',
                   policy_name, table_name, using_expr);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create policies for all tables
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY['clients', 'devis', 'chantiers', 'depenses', 'pointages', 'equipe', 'catalogue', 'entreprise', 'events'];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    -- SELECT policy
    PERFORM create_policy_if_not_exists(
      format('Users can view own %s', tbl),
      tbl,
      'SELECT',
      'user_id = auth.uid()'
    );

    -- INSERT policy
    PERFORM create_policy_if_not_exists(
      format('Users can create own %s', tbl),
      tbl,
      'INSERT',
      NULL,
      'user_id = auth.uid()'
    );

    -- UPDATE policy
    PERFORM create_policy_if_not_exists(
      format('Users can update own %s', tbl),
      tbl,
      'UPDATE',
      'user_id = auth.uid()',
      'user_id = auth.uid()'
    );

    -- DELETE policy (skip for entreprise)
    IF tbl != 'entreprise' THEN
      PERFORM create_policy_if_not_exists(
        format('Users can delete own %s', tbl),
        tbl,
        'DELETE',
        'user_id = auth.uid()'
      );
    END IF;
  END LOOP;
END $$;

-- Drop helper function
DROP FUNCTION IF EXISTS create_policy_if_not_exists;

-- ============================================================================
-- STEP 6: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_devis_user_id ON devis(user_id);
CREATE INDEX IF NOT EXISTS idx_devis_client_id ON devis(client_id);
CREATE INDEX IF NOT EXISTS idx_chantiers_user_id ON chantiers(user_id);
CREATE INDEX IF NOT EXISTS idx_chantiers_client_id ON chantiers(client_id);
CREATE INDEX IF NOT EXISTS idx_depenses_user_id ON depenses(user_id);
CREATE INDEX IF NOT EXISTS idx_depenses_chantier_id ON depenses(chantier_id);
CREATE INDEX IF NOT EXISTS idx_pointages_user_id ON pointages(user_id);
CREATE INDEX IF NOT EXISTS idx_equipe_user_id ON equipe(user_id);
CREATE INDEX IF NOT EXISTS idx_catalogue_user_id ON catalogue(user_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);

-- ============================================================================
-- STEP 7: UPDATE TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['clients', 'chantiers', 'devis', 'depenses', 'equipe', 'pointages', 'catalogue', 'entreprise', 'events'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', t, t);
    EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
  END LOOP;
END $$;

-- ============================================================================
-- DONE!
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ ChantierPro database setup complete!';
  RAISE NOTICE 'All tables, policies, and indexes have been created.';
END $$;
