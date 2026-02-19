-- 025: Add dashboard_layout column to entreprise table
-- Stores the user's customized dashboard widget layout (visibility, order, active preset)
ALTER TABLE entreprise ADD COLUMN IF NOT EXISTS dashboard_layout JSONB DEFAULT NULL;

COMMENT ON COLUMN entreprise.dashboard_layout IS 'User dashboard layout config: {widgets: [{id, visible, order}], activePreset: string}';
