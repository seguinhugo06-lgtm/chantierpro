-- ============================================================================
-- Migration 026: Factures de Situation - Add linking columns to devis table
-- ============================================================================

-- Add facture linking columns (for acompte/solde/situation chain)
ALTER TABLE devis ADD COLUMN IF NOT EXISTS facture_type TEXT;
-- Values: 'acompte', 'solde', 'totale', 'situation'

ALTER TABLE devis ADD COLUMN IF NOT EXISTS devis_source_id UUID;
-- Links facture back to parent devis

ALTER TABLE devis ADD COLUMN IF NOT EXISTS situation_id UUID;
-- Links facture de situation to the specific situation snapshot

ALTER TABLE devis ADD COLUMN IF NOT EXISTS situation_numero INTEGER;
-- "Situation N°X" number for display

-- Index for efficient facture chain queries
CREATE INDEX IF NOT EXISTS idx_devis_source ON devis(devis_source_id) WHERE devis_source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devis_situation ON devis(situation_id) WHERE situation_id IS NOT NULL;
