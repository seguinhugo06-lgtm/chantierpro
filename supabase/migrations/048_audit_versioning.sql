-- ============================================================================
-- Migration 048: Audit Trail, Document Versioning & Entity Locking
-- ============================================================================
-- Adds:
--   1. audit_logs        — Full audit trail for all entity actions
--   2. document_snapshots — Document versioning (full JSON snapshots)
--   3. entity_locks       — Optimistic locking for concurrent editing
-- ============================================================================

-- ──────────────────────────────────────────────────────────
-- 1. audit_logs
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  changes JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  snapshot_id UUID,
  user_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);

-- RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT USING (
  user_id = auth.uid() OR organization_id IN (SELECT user_org_ids())
);
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

-- ──────────────────────────────────────────────────────────
-- 2. document_snapshots
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  version INTEGER NOT NULL,
  data JSONB NOT NULL,
  label TEXT,
  trigger TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_snapshots_entity ON document_snapshots(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_version ON document_snapshots(entity_type, entity_id, version DESC);

-- RLS
ALTER TABLE document_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snapshots_select" ON document_snapshots FOR SELECT USING (
  user_id = auth.uid() OR organization_id IN (SELECT user_org_ids())
);
CREATE POLICY "snapshots_insert" ON document_snapshots FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

-- ──────────────────────────────────────────────────────────
-- 3. entity_locks
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS entity_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  user_name TEXT,
  locked_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '5 minutes'),
  UNIQUE(entity_type, entity_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_locks_entity ON entity_locks(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_locks_expires ON entity_locks(expires_at);

-- RLS
ALTER TABLE entity_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locks_select" ON entity_locks FOR SELECT USING (
  user_id = auth.uid() OR organization_id IN (SELECT user_org_ids())
);
CREATE POLICY "locks_insert" ON entity_locks FOR INSERT WITH CHECK (
  user_id = auth.uid()
);
CREATE POLICY "locks_update" ON entity_locks FOR UPDATE USING (
  user_id = auth.uid() OR organization_id IN (SELECT user_org_ids())
);
CREATE POLICY "locks_delete" ON entity_locks FOR DELETE USING (
  user_id = auth.uid() OR organization_id IN (SELECT user_org_ids())
);
