-- ============================================================
-- Migration 015: Atomic Document Numbering
-- Ensures devis (DEV-YYYY-NNNNN) and facture (FAC-YYYY-NNNNN)
-- numbers are strictly sequential with no gaps or duplicates.
-- Uses advisory lock + UPSERT for concurrency safety.
-- ============================================================

-- Counter table
CREATE TABLE IF NOT EXISTS document_counters (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type    VARCHAR(10) NOT NULL,  -- 'DEV', 'FAC', 'BC'
  year        INTEGER NOT NULL,
  next_number BIGINT NOT NULL DEFAULT 1,
  UNIQUE(user_id, doc_type, year)
);

-- RLS
ALTER TABLE document_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own counters"
  ON document_counters
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Atomic increment function
CREATE OR REPLACE FUNCTION get_next_document_number(
  p_user_id   UUID,
  p_doc_type  VARCHAR(10),
  p_year      INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next  BIGINT;
  v_pad   INTEGER := 5;
BEGIN
  -- Acquire advisory lock keyed on user + type + year to prevent races
  PERFORM pg_advisory_xact_lock(
    hashtext(p_user_id::text || p_doc_type || p_year::text)
  );

  -- Upsert: insert row if missing, otherwise increment
  INSERT INTO document_counters (user_id, doc_type, year, next_number)
  VALUES (p_user_id, p_doc_type, p_year, 2)
  ON CONFLICT (user_id, doc_type, year)
  DO UPDATE SET next_number = document_counters.next_number + 1
  RETURNING next_number - 1 INTO v_next;

  -- BC uses 3-digit padding
  IF p_doc_type = 'BC' THEN
    v_pad := 3;
  END IF;

  RETURN p_doc_type || '-' || p_year::text || '-' || lpad(v_next::text, v_pad, '0');
END;
$$;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_document_counters_lookup
  ON document_counters(user_id, doc_type, year);

-- Email log table for future email service
CREATE TABLE IF NOT EXISTS email_logs (
  id             BIGSERIAL PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient      VARCHAR(255) NOT NULL,
  subject        VARCHAR(500),
  document_type  VARCHAR(50),
  document_id    TEXT,
  status         VARCHAR(50) DEFAULT 'sent',
  error_message  TEXT,
  sent_at        TIMESTAMPTZ DEFAULT NOW(),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own email logs"
  ON email_logs
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_email_logs_user
  ON email_logs(user_id, sent_at DESC);
