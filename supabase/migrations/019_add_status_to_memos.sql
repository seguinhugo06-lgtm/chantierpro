-- ============================================================
-- Migration 019: Add status column to memos table
-- ============================================================
-- Enables Kanban view with 3 statuses: a_faire, en_cours, termine
-- Syncs with existing is_done boolean for backward compatibility

-- 1. Add status column (idempotent)
ALTER TABLE memos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'a_faire';

-- 2. Backfill existing data
UPDATE memos SET status = 'termine' WHERE is_done = true AND (status IS NULL OR status = 'a_faire');
UPDATE memos SET status = 'a_faire' WHERE is_done = false AND status IS NULL;

-- 3. Index for Kanban queries
CREATE INDEX IF NOT EXISTS idx_memos_status ON memos(status);
