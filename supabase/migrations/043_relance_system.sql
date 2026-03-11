-- ============================================================================
-- Migration 043: Relance System
-- Creates tables for tracking automatic reminder executions and exclusions
-- ============================================================================

-- ── Table: relance_executions ────────────────────────────────────────────────
-- Tracks every reminder sent (auto or manual) for legal proof and analytics

CREATE TABLE IF NOT EXISTS relance_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  organization_id UUID,

  -- Document reference
  document_id UUID NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('devis', 'facture')),
  document_numero TEXT,

  -- Client reference
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Step info (from entreprise.relance_config)
  step_id TEXT NOT NULL,
  step_name TEXT,
  step_delay INTEGER,
  sequence_type TEXT NOT NULL CHECK (sequence_type IN ('devis', 'facture')),

  -- Execution details
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'email_sms', 'whatsapp')),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'opened', 'clicked', 'cancelled')),

  -- Content snapshot (for legal proof - never delete)
  subject TEXT,
  body TEXT,
  sms_body TEXT,

  -- Tracking
  tracking_token UUID DEFAULT gen_random_uuid(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,

  -- Source
  triggered_by TEXT NOT NULL DEFAULT 'auto' CHECK (triggered_by IN ('auto', 'manual', 'bulk')),
  error_message TEXT,

  -- Extra data
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for relance_executions
CREATE INDEX IF NOT EXISTS idx_relance_exec_user
  ON relance_executions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_relance_exec_org
  ON relance_executions(organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_relance_exec_document
  ON relance_executions(document_id, step_delay);

CREATE INDEX IF NOT EXISTS idx_relance_exec_client
  ON relance_executions(client_id, created_at DESC)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_relance_exec_status
  ON relance_executions(status)
  WHERE status = 'sent';

CREATE INDEX IF NOT EXISTS idx_relance_exec_tracking
  ON relance_executions(tracking_token);

-- ── Table: relance_exclusions ────────────────────────────────────────────────
-- Documents or clients excluded from automatic reminders

CREATE TABLE IF NOT EXISTS relance_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  organization_id UUID,

  -- What is excluded
  scope TEXT NOT NULL CHECK (scope IN ('document', 'client')),
  document_id UUID,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

  -- Reason
  reason TEXT CHECK (reason IN ('manual', 'paid', 'dispute', 'arrangement', 'unsubscribe', 'vip')),
  notes TEXT,

  -- Duration (NULL = permanent)
  excluded_until TIMESTAMPTZ,

  -- Metadata
  created_by TEXT NOT NULL DEFAULT 'user' CHECK (created_by IN ('user', 'system', 'unsubscribe_link')),
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_document_scope CHECK (
    (scope = 'document' AND document_id IS NOT NULL) OR
    (scope = 'client' AND client_id IS NOT NULL)
  )
);

-- Indexes for relance_exclusions
CREATE INDEX IF NOT EXISTS idx_relance_excl_user
  ON relance_exclusions(user_id);

CREATE INDEX IF NOT EXISTS idx_relance_excl_org
  ON relance_exclusions(organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_relance_excl_document
  ON relance_exclusions(document_id)
  WHERE document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_relance_excl_client
  ON relance_exclusions(client_id)
  WHERE client_id IS NOT NULL;

-- ── Add relance_config column to entreprise ──────────────────────────────────
ALTER TABLE entreprise
  ADD COLUMN IF NOT EXISTS relance_config JSONB;

COMMENT ON COLUMN entreprise.relance_config IS
  'JSON config for automatic reminders. Structure: { enabled: bool, devisSteps: [], factureSteps: [] }';

-- ── RLS Policies ─────────────────────────────────────────────────────────────

ALTER TABLE relance_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE relance_exclusions ENABLE ROW LEVEL SECURITY;

-- relance_executions: users can manage their own org's data
CREATE POLICY "relance_executions_select" ON relance_executions
  FOR SELECT USING (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "relance_executions_insert" ON relance_executions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "relance_executions_update" ON relance_executions
  FOR UPDATE USING (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- relance_exclusions: users can manage their own org's exclusions
CREATE POLICY "relance_exclusions_select" ON relance_exclusions
  FOR SELECT USING (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "relance_exclusions_insert" ON relance_exclusions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "relance_exclusions_update" ON relance_exclusions
  FOR UPDATE USING (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "relance_exclusions_delete" ON relance_exclusions
  FOR DELETE USING (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- ── Service role bypass (for Edge Function cron) ─────────────────────────────
-- The process-relances Edge Function uses service_role_key which bypasses RLS
-- No additional policies needed for service role access
