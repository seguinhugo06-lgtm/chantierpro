-- ============================================================================
-- MIGRATION: Sprint 3 - Bibliothèque d'Ouvrages, Sous-Traitants, Commandes
-- Version: 012
-- Date: 2026-02-06
-- Description:
--   - Add ouvrages table for work item library with composite pricing
--   - Add fournisseurs table for supplier management
--   - Add sous_traitants table for subcontractor management
--   - Add commandes_fournisseurs table for purchase orders
--   - Add commande_lignes table for PO line items
-- ============================================================================

-- ============================================================================
-- FOURNISSEURS: Supplier management
-- ============================================================================

CREATE TABLE IF NOT EXISTS fournisseurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  contact TEXT,
  email TEXT,
  telephone TEXT,
  adresse TEXT,
  siret TEXT,
  categorie TEXT DEFAULT 'materiaux' CHECK (categorie IN ('materiaux', 'location', 'outillage', 'divers')),
  conditions_paiement INTEGER DEFAULT 30,
  notes TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE fournisseurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own fournisseurs"
ON fournisseurs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_fournisseurs_user
ON fournisseurs(user_id);

COMMENT ON TABLE fournisseurs IS 'Suppliers/vendors for materials, equipment rental, and tools';

-- ============================================================================
-- SOUS-TRAITANTS: Subcontractor management
-- ============================================================================

CREATE TABLE IF NOT EXISTS sous_traitants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  contact TEXT,
  email TEXT,
  telephone TEXT,
  adresse TEXT,
  siret TEXT NOT NULL,
  corps_metier TEXT NOT NULL,
  -- Corps de métier: plomberie, electricite, maconnerie, carrelage, peinture, menuiserie, couverture, charpente, platrerie, serrurerie, terrassement, vrd, autre

  taux_horaire NUMERIC(8,2),
  assurance_rc_pro TEXT,
  date_expiration_assurance DATE,
  attestation_urssaf BOOLEAN DEFAULT false,
  date_attestation_urssaf DATE,

  note_qualite INTEGER DEFAULT 3 CHECK (note_qualite >= 1 AND note_qualite <= 5),
  notes TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sous_traitants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sous_traitants"
ON sous_traitants
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sous_traitants_user
ON sous_traitants(user_id);

CREATE INDEX IF NOT EXISTS idx_sous_traitants_corps_metier
ON sous_traitants(corps_metier);

COMMENT ON TABLE sous_traitants IS 'Subcontractor management with compliance tracking (assurance, URSSAF)';

-- ============================================================================
-- OUVRAGES: Work item library with composite pricing
-- ============================================================================

CREATE TABLE IF NOT EXISTS ouvrages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT,
  designation TEXT NOT NULL,
  description TEXT,
  unite TEXT NOT NULL DEFAULT 'u',
  categorie TEXT,

  -- Composite pricing
  composants JSONB NOT NULL DEFAULT '[]',
  -- Structure: [{ type: 'materiau'|'main_oeuvre'|'sous_traitance'|'location',
  --               catalogueId?, description, quantite, prixUnitaire, unite }]

  prix_unitaire_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  coefficient_vente NUMERIC(6,3) DEFAULT 1.000,
  prix_vente_ht NUMERIC(12,2) NOT NULL DEFAULT 0,

  temps_pose_heures NUMERIC(6,2) DEFAULT 0,
  difficulte INTEGER DEFAULT 1 CHECK (difficulte >= 1 AND difficulte <= 5),

  actif BOOLEAN NOT NULL DEFAULT true,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ouvrages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own ouvrages"
ON ouvrages
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ouvrages_user
ON ouvrages(user_id);

CREATE INDEX IF NOT EXISTS idx_ouvrages_categorie
ON ouvrages(categorie);

COMMENT ON TABLE ouvrages IS 'Work item library with composite pricing (materials + labor + subcontracting)';

-- ============================================================================
-- COMMANDES FOURNISSEURS: Purchase orders
-- ============================================================================

CREATE TABLE IF NOT EXISTS commandes_fournisseurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL,
  fournisseur_id UUID REFERENCES fournisseurs(id) ON DELETE SET NULL,
  fournisseur_nom TEXT NOT NULL,
  chantier_id UUID REFERENCES chantiers(id) ON DELETE SET NULL,

  date_commande DATE NOT NULL DEFAULT CURRENT_DATE,
  date_livraison_prevue DATE,
  date_livraison_reelle DATE,

  lignes JSONB NOT NULL DEFAULT '[]',
  -- Structure: [{ id, description, reference, quantite, prixUnitaire, unite, montantHt }]

  montant_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  tva_rate NUMERIC(4,2) DEFAULT 20.00,
  montant_ttc NUMERIC(12,2) NOT NULL DEFAULT 0,

  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'envoyee', 'confirmee', 'livree_partiel', 'livree', 'annulee')),

  notes TEXT,

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, numero)
);

ALTER TABLE commandes_fournisseurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own commandes"
ON commandes_fournisseurs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_commandes_user
ON commandes_fournisseurs(user_id, date_commande DESC);

CREATE INDEX IF NOT EXISTS idx_commandes_fournisseur
ON commandes_fournisseurs(fournisseur_id);

CREATE INDEX IF NOT EXISTS idx_commandes_chantier
ON commandes_fournisseurs(chantier_id);

COMMENT ON TABLE commandes_fournisseurs IS 'Purchase orders to suppliers with delivery tracking';

-- ============================================================================
-- ADD fournisseur_id to catalogue for supplier linking
-- ============================================================================

ALTER TABLE catalogue
ADD COLUMN IF NOT EXISTS fournisseur_id UUID;

ALTER TABLE catalogue
ADD COLUMN IF NOT EXISTS fournisseur_nom TEXT;

COMMENT ON COLUMN catalogue.fournisseur_id IS 'Optional link to preferred supplier';
COMMENT ON COLUMN catalogue.fournisseur_nom IS 'Supplier name (denormalized for quick display)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'fournisseurs'
  ) THEN
    RAISE EXCEPTION 'Table fournisseurs was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'sous_traitants'
  ) THEN
    RAISE EXCEPTION 'Table sous_traitants was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'ouvrages'
  ) THEN
    RAISE EXCEPTION 'Table ouvrages was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'commandes_fournisseurs'
  ) THEN
    RAISE EXCEPTION 'Table commandes_fournisseurs was not created';
  END IF;

  RAISE NOTICE 'Migration 012 completed successfully';
END $$;
