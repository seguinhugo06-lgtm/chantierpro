-- Migration 017: Trésorerie Prévisions & Settings
-- Creates tables for cash flow forecasting, recurring charges, and treasury settings
-- All tables have RLS enabled with user_id isolation

-- ============================================================================
-- 1. TRESORERIE_PREVISIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS tresorerie_previsions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('entree', 'sortie')),
    description TEXT NOT NULL,
    montant NUMERIC(12, 2) NOT NULL,
    date_prevue DATE NOT NULL DEFAULT CURRENT_DATE,
    categorie TEXT NOT NULL DEFAULT 'Divers',
    statut VARCHAR(20) NOT NULL DEFAULT 'prevu' CHECK (statut IN ('prevu', 'paye', 'annule')),
    recurrence VARCHAR(20) DEFAULT 'unique' CHECK (recurrence IN ('unique', 'mensuel', 'trimestriel', 'annuel')),
    recurrence_parent_id UUID REFERENCES tresorerie_previsions(id) ON DELETE SET NULL,
    chantier_id UUID REFERENCES chantiers(id) ON DELETE SET NULL,
    devis_id UUID REFERENCES devis(id) ON DELETE SET NULL,
    depense_id UUID REFERENCES depenses(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tresorerie_previsions_user ON tresorerie_previsions(user_id);
CREATE INDEX IF NOT EXISTS idx_tresorerie_previsions_user_date ON tresorerie_previsions(user_id, date_prevue);
CREATE INDEX IF NOT EXISTS idx_tresorerie_previsions_user_statut ON tresorerie_previsions(user_id, statut);
CREATE INDEX IF NOT EXISTS idx_tresorerie_previsions_recurrence_parent ON tresorerie_previsions(recurrence_parent_id) WHERE recurrence_parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tresorerie_previsions_devis ON tresorerie_previsions(devis_id) WHERE devis_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tresorerie_previsions_depense ON tresorerie_previsions(depense_id) WHERE depense_id IS NOT NULL;

-- Enable RLS
ALTER TABLE tresorerie_previsions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own tresorerie_previsions"
ON tresorerie_previsions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tresorerie_previsions"
ON tresorerie_previsions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tresorerie_previsions"
ON tresorerie_previsions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tresorerie_previsions"
ON tresorerie_previsions FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_tresorerie_previsions_updated_at
    BEFORE UPDATE ON tresorerie_previsions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 2. TRESORERIE_SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS tresorerie_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    seuil_alerte NUMERIC(12, 2) DEFAULT 5000,
    solde_initial NUMERIC(12, 2) DEFAULT 0,
    solde_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_tresorerie_settings_user ON tresorerie_settings(user_id);

-- Enable RLS
ALTER TABLE tresorerie_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own tresorerie_settings"
ON tresorerie_settings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tresorerie_settings"
ON tresorerie_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tresorerie_settings"
ON tresorerie_settings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tresorerie_settings"
ON tresorerie_settings FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_tresorerie_settings_updated_at
    BEFORE UPDATE ON tresorerie_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 3. HELPER: Generate recurring prevision instances
-- ============================================================================

-- Function to generate recurring instances for the next 12 months
CREATE OR REPLACE FUNCTION generate_recurring_previsions(
    p_parent_id UUID,
    p_user_id UUID,
    p_type VARCHAR(10),
    p_description TEXT,
    p_montant NUMERIC(12,2),
    p_date_start DATE,
    p_categorie TEXT,
    p_recurrence VARCHAR(20)
)
RETURNS VOID AS $$
DECLARE
    v_interval INTERVAL;
    v_next_date DATE;
    v_i INTEGER;
    v_max_instances INTEGER := 12;
BEGIN
    -- Determine interval based on recurrence type
    CASE p_recurrence
        WHEN 'mensuel' THEN v_interval := INTERVAL '1 month';
        WHEN 'trimestriel' THEN v_interval := INTERVAL '3 months';
        WHEN 'annuel' THEN v_interval := INTERVAL '1 year';
        ELSE RETURN; -- 'unique' = no recurring instances
    END CASE;

    -- Generate future instances
    FOR v_i IN 1..v_max_instances LOOP
        v_next_date := p_date_start + (v_interval * v_i);

        -- Don't generate more than 12 months into the future
        EXIT WHEN v_next_date > CURRENT_DATE + INTERVAL '12 months';

        INSERT INTO tresorerie_previsions (
            user_id, type, description, montant, date_prevue,
            categorie, statut, recurrence, recurrence_parent_id
        ) VALUES (
            p_user_id, p_type, p_description, p_montant, v_next_date,
            p_categorie, 'prevu', p_recurrence, p_parent_id
        )
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
