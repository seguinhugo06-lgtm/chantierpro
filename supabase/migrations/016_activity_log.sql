-- ============================================================
-- Migration 016: Activity Log (Audit Trail)
-- ============================================================

-- 1. Table activity_log
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  entity_type TEXT NOT NULL,        -- 'devis', 'client', 'chantier', 'facture', etc.
  entity_id UUID,                   -- ID of the entity acted on
  action TEXT NOT NULL,             -- 'create', 'update', 'delete', 'send', 'sign', etc.
  description TEXT,                 -- Human-readable description
  metadata JSONB DEFAULT '{}',      -- Additional context (old values, new values, etc.)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- 3. Policies
CREATE POLICY "Users see own activity" ON activity_log
  FOR ALL USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT get_user_org_ids())
  );

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_org_id ON activity_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
