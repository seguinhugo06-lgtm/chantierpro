-- 013_sous_traitants.sql
-- Add sous-traitant support to equipe table and link depenses to sous-traitants

-- Add sous-traitant columns to equipe
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'employe';
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS entreprise TEXT;
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS siret TEXT;
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS specialite TEXT;
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS decennale_numero TEXT;
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS decennale_expiration DATE;
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS urssaf_date DATE;
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS tarif_type TEXT DEFAULT 'horaire';
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS tarif_forfait NUMERIC(12,2);
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]';

-- Add sous-traitant link to depenses
ALTER TABLE depenses ADD COLUMN IF NOT EXISTS sous_traitant_id UUID REFERENCES equipe(id) ON DELETE SET NULL;

-- Index for faster sous-traitant lookups
CREATE INDEX IF NOT EXISTS idx_depenses_sous_traitant ON depenses(sous_traitant_id) WHERE sous_traitant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_equipe_type ON equipe(type);
