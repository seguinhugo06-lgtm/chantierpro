-- ============================================================================
-- ADD MISSING COLUMNS TO TABLES
-- Fixes data persistence issues by adding columns expected by the app
-- ============================================================================

-- ============================================================================
-- DEVIS TABLE - Add sections column
-- ============================================================================
ALTER TABLE devis ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT '[]';

-- ============================================================================
-- CHANTIERS TABLE - Add missing columns
-- ============================================================================
ALTER TABLE chantiers ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE chantiers ADD COLUMN IF NOT EXISTS avancement INTEGER DEFAULT 0;

-- ============================================================================
-- CLIENTS TABLE - Add prenom column
-- ============================================================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS prenom TEXT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Migration 010 - Added missing columns successfully';
END $$;
