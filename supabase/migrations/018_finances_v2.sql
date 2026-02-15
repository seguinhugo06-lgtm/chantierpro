-- Migration 018: Finances V2 — Extensions for backend persistence
-- Extends tresorerie tables, creates reglements, adds TVA columns to depenses
-- Safe to run whether or not migration 017 has been executed (uses IF NOT EXISTS / IF NOT EXISTS)

-- ============================================================================
-- 1. TRESORERIE_PREVISIONS — Ensure table exists (from 017) + new columns
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
    chantier_id UUID,
    devis_id UUID,
    depense_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- New columns for V2
ALTER TABLE tresorerie_previsions ADD COLUMN IF NOT EXISTS montant_ht NUMERIC(12,2);
ALTER TABLE tresorerie_previsions ADD COLUMN IF NOT EXISTS taux_tva NUMERIC(5,2) DEFAULT 20;
ALTER TABLE tresorerie_previsions ADD COLUMN IF NOT EXISTS montant_tva NUMERIC(12,2);
ALTER TABLE tresorerie_previsions ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE tresorerie_previsions ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE tresorerie_previsions ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE tresorerie_previsions ADD COLUMN IF NOT EXISTS linked_id UUID;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tresorerie_previsions_user ON tresorerie_previsions(user_id);
CREATE INDEX IF NOT EXISTS idx_tresorerie_previsions_user_date ON tresorerie_previsions(user_id, date_prevue);
CREATE INDEX IF NOT EXISTS idx_tresorerie_previsions_user_statut ON tresorerie_previsions(user_id, statut);
CREATE INDEX IF NOT EXISTS idx_tresorerie_previsions_recurrence_parent ON tresorerie_previsions(recurrence_parent_id) WHERE recurrence_parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tresorerie_previsions_devis ON tresorerie_previsions(devis_id) WHERE devis_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tresorerie_previsions_depense ON tresorerie_previsions(depense_id) WHERE depense_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tresorerie_previsions_source ON tresorerie_previsions(source) WHERE source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tresorerie_previsions_linked ON tresorerie_previsions(linked_id) WHERE linked_id IS NOT NULL;

-- Enable RLS (idempotent)
ALTER TABLE tresorerie_previsions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (DROP IF EXISTS not available for policies, so use DO block)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tresorerie_previsions' AND policyname = 'Users can view own tresorerie_previsions') THEN
    CREATE POLICY "Users can view own tresorerie_previsions" ON tresorerie_previsions FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tresorerie_previsions' AND policyname = 'Users can create own tresorerie_previsions') THEN
    CREATE POLICY "Users can create own tresorerie_previsions" ON tresorerie_previsions FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tresorerie_previsions' AND policyname = 'Users can update own tresorerie_previsions') THEN
    CREATE POLICY "Users can update own tresorerie_previsions" ON tresorerie_previsions FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tresorerie_previsions' AND policyname = 'Users can delete own tresorerie_previsions') THEN
    CREATE POLICY "Users can delete own tresorerie_previsions" ON tresorerie_previsions FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Updated_at trigger (safe: CREATE OR REPLACE for function, drop+create for trigger)
DROP TRIGGER IF EXISTS update_tresorerie_previsions_updated_at ON tresorerie_previsions;
CREATE TRIGGER update_tresorerie_previsions_updated_at
    BEFORE UPDATE ON tresorerie_previsions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 2. TRESORERIE_SETTINGS — Ensure table exists (from 017) + new columns
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

-- New columns for V2
ALTER TABLE tresorerie_settings ADD COLUMN IF NOT EXISTS regime_tva TEXT DEFAULT 'trimestriel';
ALTER TABLE tresorerie_settings ADD COLUMN IF NOT EXISTS numero_tva TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tresorerie_settings_user ON tresorerie_settings(user_id);

-- Enable RLS
ALTER TABLE tresorerie_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tresorerie_settings' AND policyname = 'Users can view own tresorerie_settings') THEN
    CREATE POLICY "Users can view own tresorerie_settings" ON tresorerie_settings FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tresorerie_settings' AND policyname = 'Users can create own tresorerie_settings') THEN
    CREATE POLICY "Users can create own tresorerie_settings" ON tresorerie_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tresorerie_settings' AND policyname = 'Users can update own tresorerie_settings') THEN
    CREATE POLICY "Users can update own tresorerie_settings" ON tresorerie_settings FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tresorerie_settings' AND policyname = 'Users can delete own tresorerie_settings') THEN
    CREATE POLICY "Users can delete own tresorerie_settings" ON tresorerie_settings FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_tresorerie_settings_updated_at ON tresorerie_settings;
CREATE TRIGGER update_tresorerie_settings_updated_at
    BEFORE UPDATE ON tresorerie_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 3. REGLEMENTS TABLE (NEW)
-- ============================================================================

CREATE TABLE IF NOT EXISTS reglements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    devis_id UUID NOT NULL,
    montant NUMERIC(12, 2) NOT NULL,
    date_reglement DATE NOT NULL DEFAULT CURRENT_DATE,
    mode_paiement TEXT DEFAULT 'virement' CHECK (mode_paiement IN ('virement', 'cheque', 'especes', 'cb', 'prelevement', 'autre')),
    reference TEXT,
    notes TEXT,
    type TEXT DEFAULT 'paiement' CHECK (type IN ('acompte', 'situation', 'solde', 'avoir', 'paiement')),
    prevision_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reglements_user ON reglements(user_id);
CREATE INDEX IF NOT EXISTS idx_reglements_devis ON reglements(devis_id);
CREATE INDEX IF NOT EXISTS idx_reglements_date ON reglements(user_id, date_reglement);

-- Enable RLS
ALTER TABLE reglements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reglements' AND policyname = 'Users can view own reglements') THEN
    CREATE POLICY "Users can view own reglements" ON reglements FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reglements' AND policyname = 'Users can create own reglements') THEN
    CREATE POLICY "Users can create own reglements" ON reglements FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reglements' AND policyname = 'Users can update own reglements') THEN
    CREATE POLICY "Users can update own reglements" ON reglements FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reglements' AND policyname = 'Users can delete own reglements') THEN
    CREATE POLICY "Users can delete own reglements" ON reglements FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_reglements_updated_at ON reglements;
CREATE TRIGGER update_reglements_updated_at
    BEFORE UPDATE ON reglements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 4. ALTER DEPENSES — Add TVA columns
-- ============================================================================

ALTER TABLE depenses ADD COLUMN IF NOT EXISTS montant_ht NUMERIC(12,2);
ALTER TABLE depenses ADD COLUMN IF NOT EXISTS taux_tva NUMERIC(5,2) DEFAULT 20;
ALTER TABLE depenses ADD COLUMN IF NOT EXISTS montant_tva NUMERIC(12,2);


-- ============================================================================
-- 5. HELPER: Generate recurring prevision instances (from 017, idempotent)
-- ============================================================================

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
    CASE p_recurrence
        WHEN 'mensuel' THEN v_interval := INTERVAL '1 month';
        WHEN 'trimestriel' THEN v_interval := INTERVAL '3 months';
        WHEN 'annuel' THEN v_interval := INTERVAL '1 year';
        ELSE RETURN;
    END CASE;

    FOR v_i IN 1..v_max_instances LOOP
        v_next_date := p_date_start + (v_interval * v_i);
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
