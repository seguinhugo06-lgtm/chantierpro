-- ============================================================
-- Migration 065 : balayage schéma prod vs code (14 juil. 2026)
-- Comparaison des clés produites par FIELD_MAPPINGS.toSupabase (code)
-- avec information_schema.columns (prod). Corrige les colonnes que le
-- code envoie mais qui manquaient → INSERT rejeté (PGRST204).
-- Idempotent. Déjà appliqué en prod via l'API management.
-- ============================================================

-- planning_events : la table prod était une très vieille version
-- (date/time/employe_id). Le code envoie le schéma riche.
ALTER TABLE planning_events ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE planning_events ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE planning_events ADD COLUMN IF NOT EXISTS all_day BOOLEAN DEFAULT FALSE;
ALTER TABLE planning_events ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE planning_events ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE planning_events ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE planning_events ADD COLUMN IF NOT EXISTS rappel INTEGER;
ALTER TABLE planning_events ADD COLUMN IF NOT EXISTS recurrence TEXT;
ALTER TABLE planning_events ADD COLUMN IF NOT EXISTS recurrence_days TEXT;
ALTER TABLE planning_events ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMPTZ;
ALTER TABLE planning_events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planned';
ALTER TABLE planning_events ADD COLUMN IF NOT EXISTS chantier_id UUID;
ALTER TABLE planning_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
-- legacy NOT NULL jamais renseignée par le code → la rendre nullable
ALTER TABLE planning_events ALTER COLUMN date DROP NOT NULL;

-- chantiers : facturation par situations
ALTER TABLE chantiers ADD COLUMN IF NOT EXISTS mode_facturation TEXT;
ALTER TABLE chantiers ADD COLUMN IF NOT EXISTS situations_data JSONB;

-- reglements : lien vers le mouvement de trésorerie
ALTER TABLE reglements ADD COLUMN IF NOT EXISTS tresorerie_mouvement_id UUID;

-- pack_items / stock_mouvements : updated_at (ajouté par buildSupabasePayload)
ALTER TABLE pack_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE stock_mouvements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

NOTIFY pgrst, 'reload schema';
