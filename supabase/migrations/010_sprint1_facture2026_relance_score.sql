-- ============================================================================
-- MIGRATION: Sprint 1 - Facture 2026, Relance améliorée, Score Santé
-- Version: 010
-- Date: 2026-02-06
-- Description:
--   - Add factures_electroniques table for Factur-X/ZUGFeRD compliance
--   - Add relance_history table for smart follow-up tracking
--   - Add relance_config to entreprise settings
--   - Add score_sante_history for tracking business health over time
-- ============================================================================

-- ============================================================================
-- FACTURES ELECTRONIQUES: Factur-X / PDP compliance tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS factures_electroniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id UUID NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  format TEXT NOT NULL DEFAULT 'factur-x-minimum',
  xml_data TEXT,
  hash_sha256 TEXT NOT NULL,
  date_emission TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_archivage TIMESTAMPTZ,
  statut_pdp TEXT DEFAULT 'local',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE factures_electroniques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own factures electroniques"
ON factures_electroniques
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Index for quick lookup by facture
CREATE INDEX IF NOT EXISTS idx_factures_electroniques_facture_id
ON factures_electroniques(facture_id);

CREATE INDEX IF NOT EXISTS idx_factures_electroniques_user_id
ON factures_electroniques(user_id);

COMMENT ON TABLE factures_electroniques IS
'Tracks electronic invoice compliance (Factur-X, ZUGFeRD) for 2026 mandate';

-- ============================================================================
-- RELANCE HISTORY: Track all follow-up communications
-- ============================================================================

CREATE TABLE IF NOT EXISTS relance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('devis', 'facture')),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  niveau TEXT NOT NULL,
  canal TEXT NOT NULL CHECK (canal IN ('email', 'sms', 'whatsapp', 'courrier')),
  message TEXT,
  statut TEXT NOT NULL DEFAULT 'envoye' CHECK (statut IN ('programme', 'envoye', 'lu', 'repondu', 'erreur')),
  date_envoi TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_lecture TIMESTAMPTZ,
  date_reponse TIMESTAMPTZ,
  automatique BOOLEAN NOT NULL DEFAULT false,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE relance_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own relance history"
ON relance_history
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_relance_history_document
ON relance_history(document_id, document_type);

CREATE INDEX IF NOT EXISTS idx_relance_history_client
ON relance_history(client_id);

CREATE INDEX IF NOT EXISTS idx_relance_history_user_id
ON relance_history(user_id);

COMMENT ON TABLE relance_history IS
'Tracks all follow-up reminders sent for devis and factures';

-- ============================================================================
-- SCORE SANTE HISTORY: Monthly business health score snapshots
-- ============================================================================

CREATE TABLE IF NOT EXISTS score_sante_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_global INTEGER NOT NULL CHECK (score_global >= 0 AND score_global <= 100),
  score_tresorerie INTEGER DEFAULT 0,
  score_carnet INTEGER DEFAULT 0,
  score_conversion INTEGER DEFAULT 0,
  score_marge INTEGER DEFAULT 0,
  score_impayes INTEGER DEFAULT 0,
  score_conformite INTEGER DEFAULT 0,
  mois DATE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, mois)
);

ALTER TABLE score_sante_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own score history"
ON score_sante_history
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_score_sante_history_user_mois
ON score_sante_history(user_id, mois DESC);

COMMENT ON TABLE score_sante_history IS
'Monthly snapshots of the business health score for trend tracking';

-- ============================================================================
-- ADD relance_config column to entreprise/user settings
-- ============================================================================

-- Add column for relance configuration (JSON)
ALTER TABLE devis
ADD COLUMN IF NOT EXISTS relance_count INTEGER DEFAULT 0;

ALTER TABLE devis
ADD COLUMN IF NOT EXISTS last_relance_niveau TEXT;

COMMENT ON COLUMN devis.relance_count IS 'Number of follow-up reminders sent for this document';
COMMENT ON COLUMN devis.last_relance_niveau IS 'Level of the last reminder sent (friendly, firm, urgent, etc.)';
