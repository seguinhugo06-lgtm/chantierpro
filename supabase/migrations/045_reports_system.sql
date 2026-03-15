-- ============================================================================
-- MIGRATION 045: Reports System (Rapports PDF automatiques)
-- Date: 2026-03-12
-- Description: Tables for generated reports metadata and auto-report config
-- ============================================================================

-- ============ 1. TABLE rapports ============
CREATE TABLE IF NOT EXISTS rapports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID,
  type TEXT NOT NULL CHECK (type IN ('activite', 'financier', 'chantier')),
  titre TEXT NOT NULL,
  periode_debut DATE NOT NULL,
  periode_fin DATE NOT NULL,
  chantier_id UUID REFERENCES chantiers(id) ON DELETE SET NULL,
  storage_path TEXT,
  file_size_bytes INTEGER,
  page_count INTEGER,
  statut TEXT DEFAULT 'genere' CHECK (statut IN ('en_cours', 'genere', 'erreur', 'envoye')),
  envoye_a TEXT[] DEFAULT '{}',
  envoye_le TIMESTAMPTZ,
  donnees_snapshot JSONB DEFAULT '{}',
  auto_genere BOOLEAN DEFAULT FALSE,
  erreur TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============ 2. TABLE rapport_config ============
CREATE TABLE IF NOT EXISTS rapport_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  organization_id UUID,
  activite_actif BOOLEAN DEFAULT FALSE,
  activite_periodicite TEXT DEFAULT 'mensuel' CHECK (activite_periodicite IN ('mensuel', 'trimestriel')),
  financier_actif BOOLEAN DEFAULT FALSE,
  financier_periodicite TEXT DEFAULT 'trimestriel' CHECK (financier_periodicite IN ('mensuel', 'trimestriel', 'annuel')),
  destinataires TEXT[] DEFAULT '{}',
  inclure_logo BOOLEAN DEFAULT TRUE,
  inclure_graphiques BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============ 3. ENABLE RLS ============
ALTER TABLE rapports ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapport_config ENABLE ROW LEVEL SECURITY;

-- ============ 4. INDEXES ============
CREATE INDEX IF NOT EXISTS idx_rapports_user ON rapports(user_id);
CREATE INDEX IF NOT EXISTS idx_rapports_type ON rapports(user_id, type);
CREATE INDEX IF NOT EXISTS idx_rapports_created ON rapports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rapports_chantier ON rapports(chantier_id) WHERE chantier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rapport_config_user ON rapport_config(user_id);

-- ============ 5. RLS POLICIES ============

-- rapports: owner access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rapports' AND policyname = 'Users manage own rapports') THEN
    CREATE POLICY "Users manage own rapports" ON rapports FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- rapport_config: owner access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rapport_config' AND policyname = 'Users manage own rapport_config') THEN
    CREATE POLICY "Users manage own rapport_config" ON rapport_config FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============ 6. RPC: get or create config ============
CREATE OR REPLACE FUNCTION get_or_create_rapport_config()
RETURNS rapport_config
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_config rapport_config;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifie';
  END IF;

  SELECT * INTO v_config FROM rapport_config WHERE user_id = v_user_id;

  IF v_config IS NULL THEN
    INSERT INTO rapport_config (user_id)
    VALUES (v_user_id)
    RETURNING * INTO v_config;
  END IF;

  RETURN v_config;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_rapport_config TO authenticated;

-- ============ 7. STORAGE BUCKET ============
-- Create 'rapports' bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('rapports', 'rapports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users access their own folder
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users access own report files') THEN
    CREATE POLICY "Users access own report files" ON storage.objects FOR ALL
      USING (
        bucket_id = 'rapports'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;
