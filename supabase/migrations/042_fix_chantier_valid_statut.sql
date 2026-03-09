-- Fix chantier valid_statut constraint to include 'archive' and 'abandonne'
-- The original constraint only allowed: prospect, planifie, en_cours, termine, annule
-- The app also uses: archive, abandonne

-- Drop the old constraint and recreate with all valid values
ALTER TABLE chantiers DROP CONSTRAINT IF EXISTS valid_statut;
ALTER TABLE chantiers ADD CONSTRAINT valid_statut
  CHECK (statut IN ('prospect', 'planifie', 'en_cours', 'termine', 'annule', 'abandonne', 'archive'));
