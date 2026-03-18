-- ============================================================
-- Migration 018: Add archived_at column to entreprise table
-- ============================================================
-- The entrepriseService.js references archived_at but the column
-- was never created, causing 42703 errors on all entreprise queries.

-- 1. Add column (idempotent)
ALTER TABLE entreprise
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Add column 'ordre' if missing (also referenced in service)
ALTER TABLE entreprise
  ADD COLUMN IF NOT EXISTS ordre INTEGER DEFAULT 0;

-- 3. Index for filtering non-archived
CREATE INDEX IF NOT EXISTS idx_entreprise_archived_at
  ON entreprise(archived_at)
  WHERE archived_at IS NULL;
