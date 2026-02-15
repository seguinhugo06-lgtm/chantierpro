-- Migration 019: Finances V3 Backend
-- Creates tresorerie_mouvements (full backend table), extends tresorerie_settings,
-- adds depenses columns, and extends reglements for full backend integration.
-- Safe to run multiple times (uses IF NOT EXISTS / IF NOT EXISTS)

-- ============================================================================
-- 1. TRESORERIE_MOUVEMENTS — Full backend table for treasury movements
-- ============================================================================

CREATE TABLE IF NOT EXISTS tresorerie_mouvements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    montant NUMERIC(12, 2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type TEXT NOT NULL DEFAULT 'sortie' CHECK (type IN ('entree', 'sortie')),
    categorie TEXT NULL CHECK (categorie IN (
        'Client', 'Fournisseur', 'Loyer', 'Assurance', 'Salaires',
        'Materiaux', 'Sous-traitance', 'Divers', 'Location', 'Deplacements'
    )),
    statut TEXT NOT NULL DEFAULT 'prevu' CHECK (statut IN ('prevu', 'paye', 'en_retard', 'annule')),
    -- Recurrence
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    recurring_frequency TEXT NULL CHECK (recurring_frequency IN ('mensuel', 'trimestriel', 'annuel')),
    recurring_end_date DATE NULL,
    parent_recurring_id UUID NULL REFERENCES tresorerie_mouvements(id) ON DELETE SET NULL,
    -- Links
    devis_id UUID NULL,
    chantier_id UUID NULL,
    client_id UUID NULL,
    depense_id UUID NULL,
    -- TVA
    montant_ht NUMERIC(12, 2) NULL,
    taux_tva NUMERIC(5, 2) NULL DEFAULT 20,
    montant_tva NUMERIC(12, 2) NULL,
    autoliquidation BOOLEAN NOT NULL DEFAULT false,
    -- Metadata
    notes TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tresorerie_mouvements_user ON tresorerie_mouvements(user_id);
CREATE INDEX IF NOT EXISTS idx_tresorerie_mouvements_date ON tresorerie_mouvements(date);
CREATE INDEX IF NOT EXISTS idx_tresorerie_mouvements_statut ON tresorerie_mouvements(statut);
CREATE INDEX IF NOT EXISTS idx_tresorerie_mouvements_type ON tresorerie_mouvements(type);
CREATE INDEX IF NOT EXISTS idx_tresorerie_mouvements_devis ON tresorerie_mouvements(devis_id) WHERE devis_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tresorerie_mouvements_parent ON tresorerie_mouvements(parent_recurring_id) WHERE parent_recurring_id IS NOT NULL;

-- Enable RLS
ALTER TABLE tresorerie_mouvements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tresorerie_mouvements' AND policyname = 'Users manage own tresorerie_mouvements') THEN
    CREATE POLICY "Users manage own tresorerie_mouvements" ON tresorerie_mouvements FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_tresorerie_mouvements_updated_at ON tresorerie_mouvements;
CREATE TRIGGER update_tresorerie_mouvements_updated_at
    BEFORE UPDATE ON tresorerie_mouvements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 2. TRESORERIE_SETTINGS — Add regime_tva constraint + new columns
-- ============================================================================

-- Add constraint check for regime_tva (safe: only if column exists)
DO $$ BEGIN
  -- Ensure regime_tva has proper check constraint
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tresorerie_settings' AND column_name = 'regime_tva') THEN
    -- Drop old constraint if exists, add new one
    ALTER TABLE tresorerie_settings DROP CONSTRAINT IF EXISTS tresorerie_settings_regime_tva_check;
    ALTER TABLE tresorerie_settings ADD CONSTRAINT tresorerie_settings_regime_tva_check
      CHECK (regime_tva IN ('mensuel', 'trimestriel', 'reel_simplifie_trimestriel', 'reel_normal_mensuel', 'franchise', 'auto_entrepreneur'));
  END IF;
END $$;


-- ============================================================================
-- 3. DEPENSES — Add missing columns for categorization
-- ============================================================================

ALTER TABLE depenses ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'paye';
ALTER TABLE depenses ADD COLUMN IF NOT EXISTS type_depense TEXT DEFAULT 'achat';


-- ============================================================================
-- 4. REGLEMENTS — Add tresorerie_mouvement_id link
-- ============================================================================

ALTER TABLE reglements ADD COLUMN IF NOT EXISTS tresorerie_mouvement_id UUID;


-- ============================================================================
-- 5. DEDUP FUNCTION — Prevents duplicate recurring previsions server-side
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_duplicate_recurring_prevision()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if a prevision with the same parent, description, and month already exists
    IF NEW.recurrence_parent_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM tresorerie_previsions
            WHERE recurrence_parent_id = NEW.recurrence_parent_id
              AND description = NEW.description
              AND date_trunc('month', date_prevue) = date_trunc('month', NEW.date_prevue)
              AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
              AND user_id = NEW.user_id
        ) THEN
            RETURN NULL; -- Silently skip the duplicate
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_recurring ON tresorerie_previsions;
CREATE TRIGGER trg_prevent_duplicate_recurring
    BEFORE INSERT ON tresorerie_previsions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_duplicate_recurring_prevision();
