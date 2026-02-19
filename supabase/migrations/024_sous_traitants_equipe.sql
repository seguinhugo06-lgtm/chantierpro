-- ============================================================================
-- MIGRATION 024: Sous-traitants intégrés dans equipe
-- Date: 2026-02-16
-- Description:
--   - Ajoute les colonnes sous-traitant à la table equipe (type, entreprise,
--     SIRET, spécialité, décennale, URSSAF, tarification, documents)
--   - Ajoute sous_traitant_id dans depenses pour lier les dépenses aux ST
--   - Index pour performance
-- ============================================================================

-- Colonnes sous-traitant dans equipe
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

-- Lien depenses → sous-traitant
ALTER TABLE depenses ADD COLUMN IF NOT EXISTS sous_traitant_id UUID REFERENCES equipe(id) ON DELETE SET NULL;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_equipe_type ON equipe(type);
CREATE INDEX IF NOT EXISTS idx_depenses_sous_traitant ON depenses(sous_traitant_id) WHERE sous_traitant_id IS NOT NULL;

-- Vérification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipe' AND column_name = 'type'
  ) THEN
    RAISE EXCEPTION 'Column type was not added to equipe';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'depenses' AND column_name = 'sous_traitant_id'
  ) THEN
    RAISE EXCEPTION 'Column sous_traitant_id was not added to depenses';
  END IF;

  RAISE NOTICE 'Migration 024 (sous-traitants equipe) completed successfully';
END $$;
