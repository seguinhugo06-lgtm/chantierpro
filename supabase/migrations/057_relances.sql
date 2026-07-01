-- ============================================================
-- Migration 057: Système de relances (exécutions + exclusions + config)
-- ============================================================
-- Le moteur de relances (relanceEngine.js / useRelances.js) écrivait dans
-- relance_executions et relance_exclusions, et la config dans l'entreprise —
-- mais ces tables/colonnes n'avaient jamais été créées. Rien n'était donc
-- persisté (relances non historisées, config non rechargée → toujours désactivée).

-- ============================================================
-- 1. relance_executions — historique des relances envoyées
-- ============================================================
-- NOTE: une ancienne table relance_executions (schéma incompatible : devis_id /
-- relance_id, jamais alimentée — 0 ligne) existait. On la remplace par le schéma
-- attendu par relanceEngine.js (document_id / step_id…). Aucun code n'utilise
-- l'ancien schéma, donc drop sans perte.
DROP TABLE IF EXISTS relance_executions CASCADE;

CREATE TABLE IF NOT EXISTS relance_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  document_id UUID,
  document_type TEXT,          -- 'devis' | 'facture'
  document_numero TEXT,
  client_id UUID,
  step_id TEXT,
  step_name TEXT,
  step_delay INTEGER,
  sequence_type TEXT,          -- 'devis' | 'facture'
  channel TEXT DEFAULT 'email',
  status TEXT DEFAULT 'sent',  -- sent | failed | opened | clicked | cancelled
  subject TEXT,
  body TEXT,
  sms_body TEXT,
  tracking_token UUID,
  triggered_by TEXT DEFAULT 'manual', -- manual | auto
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE relance_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_relance_executions" ON relance_executions;
CREATE POLICY "users_own_relance_executions" ON relance_executions
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_relance_exec_user ON relance_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_relance_exec_org ON relance_executions(organization_id);
CREATE INDEX IF NOT EXISTS idx_relance_exec_document ON relance_executions(document_id);
CREATE INDEX IF NOT EXISTS idx_relance_exec_client ON relance_executions(client_id);
CREATE INDEX IF NOT EXISTS idx_relance_exec_token ON relance_executions(tracking_token);

-- ============================================================
-- 2. relance_exclusions — documents/clients exclus des relances
-- ============================================================
CREATE TABLE IF NOT EXISTS relance_exclusions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  scope TEXT NOT NULL,         -- 'document' | 'client'
  document_id UUID,
  client_id UUID,
  reason TEXT DEFAULT 'manual',
  notes TEXT,
  created_by TEXT DEFAULT 'user',
  excluded_until TIMESTAMPTZ,  -- NULL = permanent
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE relance_exclusions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_relance_exclusions" ON relance_exclusions;
CREATE POLICY "users_own_relance_exclusions" ON relance_exclusions
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_relance_excl_user ON relance_exclusions(user_id);
CREATE INDEX IF NOT EXISTS idx_relance_excl_org ON relance_exclusions(organization_id);
CREATE INDEX IF NOT EXISTS idx_relance_excl_document ON relance_exclusions(document_id);
CREATE INDEX IF NOT EXISTS idx_relance_excl_client ON relance_exclusions(client_id);

-- ============================================================
-- 3. Config des relances sur l'entreprise
-- ============================================================
-- relance_config : { enabled, devisSteps[], factureSteps[] } (persistance propre,
-- via le même mapping que les autres champs entreprise).
ALTER TABLE entreprise
  ADD COLUMN IF NOT EXISTS relance_config JSONB,
  ADD COLUMN IF NOT EXISTS settings_json JSONB;
