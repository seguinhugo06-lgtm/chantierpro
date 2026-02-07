-- ============================================================================
-- MIGRATION: Sprint 2 - Situations de Travaux, Trésorerie, Rapports Chantier
-- Version: 011
-- Date: 2026-02-06
-- Description:
--   - Add situations_travaux table for progress billing
--   - Add tresorerie_previsions table for cash flow forecasting
--   - Add rapports_chantier table for site reports
-- ============================================================================

-- ============================================================================
-- SITUATIONS DE TRAVAUX: Progress billing / intermediate invoicing
-- ============================================================================

CREATE TABLE IF NOT EXISTS situations_travaux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id UUID NOT NULL REFERENCES chantiers(id) ON DELETE CASCADE,
  devis_id UUID REFERENCES devis(id) ON DELETE SET NULL,
  numero INTEGER NOT NULL DEFAULT 1,
  date_situation DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Progress tracking per line item
  lignes JSONB NOT NULL DEFAULT '[]',
  -- Structure: [{ ligneId, description, quantiteTotale, quantitePrecedente, quantiteCumul, prixUnitaire, montantCumul, montantPrecedent, montantSituation }]

  -- Totals
  montant_cumul_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_precedent_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_situation_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  tva_rate NUMERIC(4,2) DEFAULT 20.00,
  montant_situation_ttc NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Retention / retenue de garantie (typically 5%)
  retenue_garantie_pct NUMERIC(4,2) DEFAULT 5.00,
  retenue_garantie_montant NUMERIC(12,2) DEFAULT 0,

  -- Acompte déjà versé
  acompte_verse NUMERIC(12,2) DEFAULT 0,

  -- Net à payer
  net_a_payer NUMERIC(12,2) NOT NULL DEFAULT 0,

  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'valide', 'facture', 'paye')),
  notes TEXT,

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(chantier_id, numero)
);

ALTER TABLE situations_travaux ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own situations"
ON situations_travaux
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_situations_chantier
ON situations_travaux(chantier_id, numero DESC);

CREATE INDEX IF NOT EXISTS idx_situations_user
ON situations_travaux(user_id);

COMMENT ON TABLE situations_travaux IS
'Progress billing snapshots - tracks cumulative work done per chantier for intermediate invoicing';

-- ============================================================================
-- TRESORERIE PREVISIONS: Cash flow forecasting
-- ============================================================================

CREATE TABLE IF NOT EXISTS tresorerie_previsions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('entree', 'sortie')),
  categorie TEXT NOT NULL,
  -- Categories: facture_client, acompte, retenue_garantie, fournisseur, salaire, charge_fixe, divers

  description TEXT NOT NULL,
  montant NUMERIC(12,2) NOT NULL,
  date_prevue DATE NOT NULL,
  date_reelle DATE,

  recurrence TEXT DEFAULT 'unique' CHECK (recurrence IN ('unique', 'mensuel', 'trimestriel', 'annuel')),

  -- Link to source document
  source_type TEXT,
  source_id UUID,

  statut TEXT NOT NULL DEFAULT 'prevu' CHECK (statut IN ('prevu', 'confirme', 'encaisse', 'annule')),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tresorerie_previsions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tresorerie"
ON tresorerie_previsions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tresorerie_user_date
ON tresorerie_previsions(user_id, date_prevue);

CREATE INDEX IF NOT EXISTS idx_tresorerie_statut
ON tresorerie_previsions(statut)
WHERE statut NOT IN ('annule', 'encaisse');

COMMENT ON TABLE tresorerie_previsions IS
'Cash flow forecasting entries - planned and actual income/expenses for treasury management';

-- ============================================================================
-- RAPPORTS CHANTIER: Site reports / compte-rendus
-- ============================================================================

CREATE TABLE IF NOT EXISTS rapports_chantier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id UUID NOT NULL REFERENCES chantiers(id) ON DELETE CASCADE,

  numero INTEGER NOT NULL DEFAULT 1,
  date_rapport DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL DEFAULT 'journalier' CHECK (type IN ('journalier', 'hebdomadaire', 'mensuel', 'incident', 'reception')),

  -- Conditions
  meteo TEXT,
  temperature NUMERIC(4,1),

  -- Personnel present
  personnel JSONB DEFAULT '[]',
  -- Structure: [{ nom, role, heuresPresent }]

  -- Work done
  travaux_realises JSONB DEFAULT '[]',
  -- Structure: [{ description, avancement, zone, corps_metier }]

  -- Issues / observations
  observations TEXT,
  incidents JSONB DEFAULT '[]',
  -- Structure: [{ description, gravite, action_corrective, photos }]

  -- Materials received
  materiaux_recus JSONB DEFAULT '[]',
  -- Structure: [{ description, quantite, fournisseur }]

  -- Photos
  photos JSONB DEFAULT '[]',
  -- Structure: [{ url, legende, phase }]

  -- Signature
  signe_par TEXT,
  date_signature TIMESTAMPTZ,

  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'valide', 'signe', 'envoye')),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(chantier_id, numero)
);

ALTER TABLE rapports_chantier ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own rapports"
ON rapports_chantier
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_rapports_chantier
ON rapports_chantier(chantier_id, date_rapport DESC);

CREATE INDEX IF NOT EXISTS idx_rapports_user
ON rapports_chantier(user_id);

COMMENT ON TABLE rapports_chantier IS
'Site reports for tracking daily/weekly work progress, incidents, and personnel on construction sites';

-- ============================================================================
-- ADD avancement columns to chantiers for progress billing integration
-- ============================================================================

ALTER TABLE chantiers
ADD COLUMN IF NOT EXISTS montant_facture_cumul NUMERIC(12,2) DEFAULT 0;

ALTER TABLE chantiers
ADD COLUMN IF NOT EXISTS derniere_situation_id UUID;

ALTER TABLE chantiers
ADD COLUMN IF NOT EXISTS nb_rapports INTEGER DEFAULT 0;

COMMENT ON COLUMN chantiers.montant_facture_cumul IS 'Cumulative amount billed through progress invoices (situations)';
COMMENT ON COLUMN chantiers.derniere_situation_id IS 'Reference to the latest situation de travaux';
COMMENT ON COLUMN chantiers.nb_rapports IS 'Count of site reports for this chantier';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'situations_travaux'
  ) THEN
    RAISE EXCEPTION 'Table situations_travaux was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'tresorerie_previsions'
  ) THEN
    RAISE EXCEPTION 'Table tresorerie_previsions was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'rapports_chantier'
  ) THEN
    RAISE EXCEPTION 'Table rapports_chantier was not created';
  END IF;

  RAISE NOTICE 'Migration 011 completed successfully';
END $$;
