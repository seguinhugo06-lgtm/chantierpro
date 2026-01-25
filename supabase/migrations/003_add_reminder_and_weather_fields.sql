-- ============================================================================
-- MIGRATION: Add reminder tracking and weather forecast fields
-- Version: 003
-- Date: 2026-01-24
-- Description:
--   - Add last_reminder_sent_at to devis for tracking client follow-ups
--   - Add weather_forecast to chantiers for planning purposes
-- ============================================================================

-- ============================================================================
-- DEVIS TABLE: Add reminder tracking
-- ============================================================================

-- Add column for tracking last reminder sent
ALTER TABLE devis
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN devis.last_reminder_sent_at IS
'Timestamp of when the last payment/signature reminder was sent to the client';

-- Add index for querying devis that need reminders
-- Query pattern: Find devis where no reminder sent OR reminder sent > X days ago
CREATE INDEX IF NOT EXISTS idx_devis_last_reminder_sent_at
ON devis(last_reminder_sent_at)
WHERE statut IN ('envoye', 'en_attente');

-- Add composite index for reminder automation queries
-- Query: Find unpaid invoices or pending quotes needing reminder
CREATE INDEX IF NOT EXISTS idx_devis_reminder_candidates
ON devis(type, statut, last_reminder_sent_at)
WHERE statut NOT IN ('payee', 'refuse', 'annule');

-- ============================================================================
-- CHANTIERS TABLE: Add weather forecast
-- ============================================================================

-- Add column for weather forecast (JSONB for flexibility)
ALTER TABLE chantiers
ADD COLUMN IF NOT EXISTS weather_forecast JSONB;

-- Add comment for documentation
COMMENT ON COLUMN chantiers.weather_forecast IS
'Weather forecast data for the job site location. Structure: { date: string, temp: number, condition: string, icon: string, precipitation: number, wind: number, alerts: string[] }[]';

-- Add index for querying chantiers with weather alerts
-- Using GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_chantiers_weather_forecast
ON chantiers USING gin(weather_forecast);

-- ============================================================================
-- HELPER FUNCTION: Check if reminder is needed
-- ============================================================================

CREATE OR REPLACE FUNCTION needs_reminder(
  p_devis_id UUID,
  p_days_threshold INTEGER DEFAULT 7
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_reminder TIMESTAMPTZ;
  v_statut TEXT;
  v_date DATE;
BEGIN
  SELECT last_reminder_sent_at, statut, date::DATE
  INTO v_last_reminder, v_statut, v_date
  FROM devis
  WHERE id = p_devis_id;

  -- Skip if already paid, refused, or cancelled
  IF v_statut IN ('payee', 'refuse', 'annule') THEN
    RETURN FALSE;
  END IF;

  -- Need reminder if never sent and older than threshold
  IF v_last_reminder IS NULL THEN
    RETURN (CURRENT_DATE - v_date) >= p_days_threshold;
  END IF;

  -- Need reminder if last reminder was sent more than threshold days ago
  RETURN (CURRENT_DATE - v_last_reminder::DATE) >= p_days_threshold;
END;
$$;

COMMENT ON FUNCTION needs_reminder IS
'Check if a devis needs a reminder based on last_reminder_sent_at and days threshold';

-- ============================================================================
-- HELPER FUNCTION: Get devis needing reminders
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pending_reminders(
  p_user_id UUID,
  p_days_threshold INTEGER DEFAULT 7
)
RETURNS TABLE (
  id UUID,
  numero TEXT,
  type TEXT,
  statut TEXT,
  total_ttc NUMERIC,
  date DATE,
  last_reminder_sent_at TIMESTAMPTZ,
  days_since_last_reminder INTEGER,
  client_id UUID,
  client_nom TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.numero,
    d.type,
    d.statut,
    d.total_ttc,
    d.date::DATE,
    d.last_reminder_sent_at,
    CASE
      WHEN d.last_reminder_sent_at IS NULL THEN (CURRENT_DATE - d.date::DATE)
      ELSE (CURRENT_DATE - d.last_reminder_sent_at::DATE)
    END AS days_since_last_reminder,
    c.id AS client_id,
    c.nom AS client_nom
  FROM devis d
  LEFT JOIN clients c ON d.client_id = c.id
  WHERE d.user_id = p_user_id
    AND d.statut NOT IN ('payee', 'refuse', 'annule', 'brouillon')
    AND d.statut NOT IN ('annule')
    AND (
      (d.last_reminder_sent_at IS NULL AND (CURRENT_DATE - d.date::DATE) >= p_days_threshold)
      OR
      (d.last_reminder_sent_at IS NOT NULL AND (CURRENT_DATE - d.last_reminder_sent_at::DATE) >= p_days_threshold)
    )
  ORDER BY
    CASE WHEN d.type = 'facture' THEN 0 ELSE 1 END,  -- Invoices first
    days_since_last_reminder DESC;
END;
$$;

COMMENT ON FUNCTION get_pending_reminders IS
'Get all devis (quotes and invoices) that need a reminder for a specific user';

-- ============================================================================
-- HELPER FUNCTION: Update reminder timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_reminder_sent(
  p_devis_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE devis
  SET last_reminder_sent_at = NOW()
  WHERE id = p_devis_id
    AND user_id = auth.uid();  -- RLS enforcement
END;
$$;

COMMENT ON FUNCTION mark_reminder_sent IS
'Mark a devis as having had a reminder sent (updates last_reminder_sent_at to now)';

-- ============================================================================
-- HELPER FUNCTION: Get weather alerts for upcoming chantiers
-- ============================================================================

CREATE OR REPLACE FUNCTION get_weather_alerts(
  p_user_id UUID,
  p_days_ahead INTEGER DEFAULT 7
)
RETURNS TABLE (
  chantier_id UUID,
  chantier_nom TEXT,
  date_debut DATE,
  weather_date DATE,
  condition TEXT,
  alert_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ch.id AS chantier_id,
    ch.nom AS chantier_nom,
    ch.date_debut::DATE,
    (forecast->>'date')::DATE AS weather_date,
    forecast->>'condition' AS condition,
    CASE
      WHEN forecast->>'condition' IN ('rainy', 'stormy', 'heavy_rain')
        THEN 'Pluie prévue - Reporter les travaux extérieurs'
      WHEN (forecast->>'wind')::NUMERIC > 50
        THEN 'Vent fort prévu - Sécuriser le chantier'
      WHEN (forecast->>'temp')::NUMERIC < 0
        THEN 'Gel prévu - Protéger les matériaux'
      WHEN (forecast->>'temp')::NUMERIC > 35
        THEN 'Canicule prévue - Prévoir pauses régulières'
      ELSE NULL
    END AS alert_message
  FROM chantiers ch,
       jsonb_array_elements(ch.weather_forecast) AS forecast
  WHERE ch.user_id = p_user_id
    AND ch.statut IN ('en_cours', 'planifie', 'prospect')
    AND ch.date_debut <= CURRENT_DATE + (p_days_ahead || ' days')::INTERVAL
    AND (forecast->>'date')::DATE >= CURRENT_DATE
    AND (
      forecast->>'condition' IN ('rainy', 'stormy', 'heavy_rain')
      OR (forecast->>'wind')::NUMERIC > 50
      OR (forecast->>'temp')::NUMERIC < 0
      OR (forecast->>'temp')::NUMERIC > 35
    );
END;
$$;

COMMENT ON FUNCTION get_weather_alerts IS
'Get weather alerts for upcoming chantiers that may affect work';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION needs_reminder TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_reminders TO authenticated;
GRANT EXECUTE ON FUNCTION mark_reminder_sent TO authenticated;
GRANT EXECUTE ON FUNCTION get_weather_alerts TO authenticated;

-- ============================================================================
-- SAMPLE DATA STRUCTURE FOR WEATHER_FORECAST
-- ============================================================================

/*
Example weather_forecast JSON structure:

[
  {
    "date": "2026-01-24",
    "temp": 12,
    "temp_min": 8,
    "temp_max": 15,
    "condition": "partly_cloudy",
    "icon": "cloud-sun",
    "precipitation": 10,
    "wind": 15,
    "humidity": 65,
    "alerts": []
  },
  {
    "date": "2026-01-25",
    "temp": 8,
    "temp_min": 5,
    "temp_max": 10,
    "condition": "rainy",
    "icon": "cloud-rain",
    "precipitation": 80,
    "wind": 25,
    "humidity": 85,
    "alerts": ["Pluie modérée prévue"]
  }
]

To update weather forecast:
UPDATE chantiers
SET weather_forecast = '[{"date": "2026-01-24", "temp": 12, "condition": "sunny", ...}]'::JSONB
WHERE id = 'chantier-uuid';
*/

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================

/*
-- To rollback this migration:

DROP FUNCTION IF EXISTS get_weather_alerts;
DROP FUNCTION IF EXISTS mark_reminder_sent;
DROP FUNCTION IF EXISTS get_pending_reminders;
DROP FUNCTION IF EXISTS needs_reminder;

DROP INDEX IF EXISTS idx_chantiers_weather_forecast;
DROP INDEX IF EXISTS idx_devis_reminder_candidates;
DROP INDEX IF EXISTS idx_devis_last_reminder_sent_at;

ALTER TABLE chantiers DROP COLUMN IF EXISTS weather_forecast;
ALTER TABLE devis DROP COLUMN IF EXISTS last_reminder_sent_at;
*/

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify columns were added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'devis' AND column_name = 'last_reminder_sent_at'
  ) THEN
    RAISE EXCEPTION 'Column devis.last_reminder_sent_at was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chantiers' AND column_name = 'weather_forecast'
  ) THEN
    RAISE EXCEPTION 'Column chantiers.weather_forecast was not created';
  END IF;

  RAISE NOTICE 'Migration 003 completed successfully';
END $$;
