-- 034: Consolider le modèle de données événements
-- planning_events (vide) est supprimée, events est enrichie

-- Ajouter les colonnes manquantes à events
ALTER TABLE events ADD COLUMN IF NOT EXISTS duration_minutes integer;
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence text DEFAULT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_end_date date;
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_days integer[];
ALTER TABLE events ADD COLUMN IF NOT EXISTS employe_id uuid;
ALTER TABLE events ADD COLUMN IF NOT EXISTS status text DEFAULT 'planned';
ALTER TABLE events ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS rappel text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS devis_id uuid;

-- Supprimer planning_events (table vide, remplacée par events)
DROP TABLE IF EXISTS planning_events;

-- RLS sur events (si pas déjà en place)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own events" ON events;
CREATE POLICY "Users can manage own events" ON events
  FOR ALL USING (auth.uid() = user_id);

-- Index utiles
CREATE INDEX IF NOT EXISTS idx_events_user_start ON events(user_id, start_date);
CREATE INDEX IF NOT EXISTS idx_events_user_type ON events(user_id, type);
