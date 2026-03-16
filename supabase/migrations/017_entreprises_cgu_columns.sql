-- ============================================================
-- Migration 017: Add CGU acceptance columns to entreprises table
-- LEGAL-001: Required to persist CGU acceptance across sessions
-- ============================================================

ALTER TABLE entreprises
  ADD COLUMN IF NOT EXISTS cgu_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cgu_version TEXT;

-- Index for quick lookup of users who haven't accepted yet
CREATE INDEX IF NOT EXISTS idx_entreprises_cgu_accepted_at
  ON entreprises(cgu_accepted_at)
  WHERE cgu_accepted_at IS NULL;
