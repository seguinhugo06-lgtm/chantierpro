-- Migration: Equipes (Teams) Management System
-- Manages work teams, members, and capacity

-- Create equipes table
CREATE TABLE IF NOT EXISTS equipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nom VARCHAR(255) NOT NULL,
    specialite VARCHAR(100),
    couleur VARCHAR(7) DEFAULT '#3b82f6',
    membres JSONB DEFAULT '[]'::jsonb,
    capacite_heures_semaine INTEGER DEFAULT 40,
    taux_horaire DECIMAL(10, 2),
    notes TEXT,
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_equipes_user ON equipes(user_id);
CREATE INDEX IF NOT EXISTS idx_equipes_specialite ON equipes(specialite);
CREATE INDEX IF NOT EXISTS idx_equipes_actif ON equipes(actif) WHERE actif = true;

-- Add equipe_id to chantiers if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'chantiers' AND column_name = 'equipe_id'
    ) THEN
        ALTER TABLE chantiers ADD COLUMN equipe_id UUID REFERENCES equipes(id) ON DELETE SET NULL;
        CREATE INDEX idx_chantiers_equipe ON chantiers(equipe_id) WHERE equipe_id IS NOT NULL;
    END IF;
END $$;

-- Add heures_estimees to chantiers if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'chantiers' AND column_name = 'heures_estimees'
    ) THEN
        ALTER TABLE chantiers ADD COLUMN heures_estimees INTEGER DEFAULT 8;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE equipes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own equipes"
ON equipes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own equipes"
ON equipes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own equipes"
ON equipes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own equipes"
ON equipes FOR DELETE
USING (auth.uid() = user_id);

-- Function to calculate equipe load for a week
CREATE OR REPLACE FUNCTION get_equipe_load(
    p_equipe_id UUID,
    p_week_start DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    week_end DATE;
    total_hours INTEGER;
    capacite INTEGER;
BEGIN
    week_end := p_week_start + INTERVAL '7 days';

    -- Get equipe capacity
    SELECT capacite_heures_semaine INTO capacite
    FROM equipes
    WHERE id = p_equipe_id;

    IF capacite IS NULL THEN
        capacite := 40;
    END IF;

    -- Sum hours from chantiers this week
    SELECT COALESCE(SUM(heures_estimees), 0) INTO total_hours
    FROM chantiers
    WHERE equipe_id = p_equipe_id
      AND date_debut <= week_end
      AND (date_fin >= p_week_start OR date_fin IS NULL)
      AND statut IN ('planifie', 'en_cours');

    SELECT json_build_object(
        'total_hours', total_hours,
        'capacite', capacite,
        'percentage', ROUND((total_hours::DECIMAL / NULLIF(capacite, 0)) * 100),
        'overloaded', total_hours > capacite,
        'available_hours', GREATEST(0, capacite - total_hours)
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get equipe chantiers for a period
CREATE OR REPLACE FUNCTION get_equipe_chantiers(
    p_equipe_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE,
    p_end_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    end_date DATE;
BEGIN
    end_date := COALESCE(p_end_date, p_start_date + INTERVAL '14 days');

    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
    FROM (
        SELECT
            c.id,
            c.nom,
            c.date_debut,
            c.date_fin,
            c.heures_estimees,
            c.statut,
            c.adresse,
            cl.nom AS client_nom,
            cl.prenom AS client_prenom
        FROM chantiers c
        LEFT JOIN clients cl ON cl.id = c.client_id
        WHERE c.equipe_id = p_equipe_id
          AND c.date_debut <= end_date
          AND (c.date_fin >= p_start_date OR c.date_fin IS NULL)
          AND c.statut IN ('planifie', 'en_cours')
        ORDER BY c.date_debut ASC
    ) t;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check equipe conflicts
CREATE OR REPLACE FUNCTION check_equipe_conflicts(
    p_equipe_id UUID,
    p_chantier_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
    FROM (
        SELECT
            c.id,
            c.nom,
            c.date_debut,
            c.date_fin,
            c.heures_estimees,
            cl.nom AS client_nom
        FROM chantiers c
        LEFT JOIN clients cl ON cl.id = c.client_id
        WHERE c.equipe_id = p_equipe_id
          AND c.id != COALESCE(p_chantier_id, '00000000-0000-0000-0000-000000000000'::uuid)
          AND c.date_debut <= p_end_date
          AND (c.date_fin >= p_start_date OR c.date_fin IS NULL)
          AND c.statut IN ('planifie', 'en_cours')
    ) t;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all equipes with their current load
CREATE OR REPLACE FUNCTION get_equipes_with_load(
    p_user_id UUID,
    p_week_start DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
    FROM (
        SELECT
            e.*,
            get_equipe_load(e.id, p_week_start) AS charge,
            (
                SELECT COUNT(*)
                FROM chantiers c
                WHERE c.equipe_id = e.id
                  AND c.statut IN ('planifie', 'en_cours')
            ) AS chantiers_count
        FROM equipes e
        WHERE e.user_id = p_user_id
          AND e.actif = true
        ORDER BY e.nom ASC
    ) t;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON TABLE equipes IS 'Gestion des equipes de travail et leur capacite';
