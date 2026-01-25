-- ============================================================================
-- CHANTIERPRO - BASE SCHEMA
-- Creates all tables required for the application
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- CLIENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  nom TEXT NOT NULL,
  email TEXT,
  telephone TEXT,
  adresse TEXT,
  ville TEXT,
  code_postal TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CHANTIERS TABLE
-- ============================================================================
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
  date_debut DATE,
  date_fin DATE,
  budget_prevu NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_statut CHECK (statut IN ('prospect', 'planifie', 'en_cours', 'termine', 'annule'))
);

-- ============================================================================
-- DEVIS TABLE (Quotes & Invoices)
-- ============================================================================
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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_type CHECK (type IN ('devis', 'facture', 'avoir')),
  CONSTRAINT valid_devis_statut CHECK (statut IN ('brouillon', 'envoye', 'accepte', 'refuse', 'annule', 'acompte_facture', 'facture', 'payee', 'en_attente'))
);

-- ============================================================================
-- CHANTIER_PHOTOS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS chantier_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  chantier_id UUID REFERENCES chantiers(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  filename TEXT,
  file_size INTEGER,
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  device TEXT,
  phase TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DEPENSES TABLE (Expenses)
-- ============================================================================
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

-- ============================================================================
-- EQUIPE TABLE (Team Members)
-- ============================================================================
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

-- ============================================================================
-- POINTAGES TABLE (Time Tracking)
-- ============================================================================
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

-- ============================================================================
-- CATALOGUE TABLE (Products & Services)
-- ============================================================================
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

-- ============================================================================
-- ENTREPRISE TABLE (Company Settings)
-- ============================================================================
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

-- ============================================================================
-- EVENTS TABLE (Calendar)
-- ============================================================================
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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_event_type CHECK (type IN ('rdv', 'chantier', 'relance', 'autre'))
);

-- ============================================================================
-- AI_SUGGESTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  data JSONB,
  dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high'))
);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
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
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Base schema (000) created successfully';
END $$;
