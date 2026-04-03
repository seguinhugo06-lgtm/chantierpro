-- ============================================================
-- Migration 022: Table garanties (parfait achèvement, biennale, décennale)
-- ============================================================

CREATE TABLE IF NOT EXISTS garanties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  chantier_id UUID,
  type TEXT NOT NULL CHECK (type IN ('parfait_achevement', 'biennale', 'decennale')),
  date_debut DATE,
  date_fin DATE,
  statut TEXT DEFAULT 'active' CHECK (statut IN ('active', 'expiree', 'reclamation')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE garanties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_garanties" ON garanties
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_garanties_chantier ON garanties(chantier_id);
CREATE INDEX IF NOT EXISTS idx_garanties_user ON garanties(user_id);
