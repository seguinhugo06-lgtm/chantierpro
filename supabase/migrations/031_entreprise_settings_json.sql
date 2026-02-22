-- 031: Add settings_json column to entreprise table
-- Stores the full entreprise config as JSON blob for bidirectional sync
-- This is the single source of truth for all Settings > Identity/Legal/Insurance/Bank fields

ALTER TABLE entreprise ADD COLUMN IF NOT EXISTS settings_json JSONB DEFAULT NULL;

COMMENT ON COLUMN entreprise.settings_json IS 'Full entreprise settings blob synced from client app (identity, legal, insurance, bank, document config)';
