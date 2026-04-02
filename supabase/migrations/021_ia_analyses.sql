-- ============================================================
-- Migration 021: Table pour stocker les analyses Devis IA
-- ============================================================

-- 1. Table (idempotent)
CREATE TABLE IF NOT EXISTS ia_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  entreprise_id UUID,
  source TEXT NOT NULL DEFAULT 'text',          -- 'text', 'voice', 'photo'
  description TEXT,
  photo_url TEXT,
  lignes JSONB DEFAULT '[]'::jsonb,
  confiance INTEGER DEFAULT 0,
  confiance_factors JSONB,
  total_ht NUMERIC DEFAULT 0,
  mode TEXT DEFAULT 'local',                    -- 'local', 'ai'
  statut TEXT DEFAULT 'terminee',               -- 'en_cours', 'terminee', 'erreur', 'appliquee'
  devis_id UUID,                                -- lien vers le devis cree
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS
ALTER TABLE ia_analyses ENABLE ROW LEVEL SECURITY;

-- 3. Policies
CREATE POLICY "users_own_analyses" ON ia_analyses
  FOR ALL USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT get_user_org_ids())
  );

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_ia_analyses_user ON ia_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_ia_analyses_org ON ia_analyses(organization_id);
CREATE INDEX IF NOT EXISTS idx_ia_analyses_entreprise ON ia_analyses(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_ia_analyses_created ON ia_analyses(created_at DESC);
