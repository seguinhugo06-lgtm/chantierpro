-- ============================================================================
-- MIGRATION: Sprint 4 - IA Devis, Carnet d'Entretien, Signature Avancée
-- Version: 013
-- Date: 2026-02-06
-- Description:
--   - Add ia_analyses table for AI-assisted quote generation from photos
--   - Add carnets_entretien table for building maintenance logs
--   - Add entretien_taches table for recurring maintenance tasks
--   - Add signatures table for advanced electronic signatures
-- ============================================================================

-- ============================================================================
-- IA ANALYSES: AI-assisted quote generation
-- ============================================================================

CREATE TABLE IF NOT EXISTS ia_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_url TEXT,
  description_utilisateur TEXT,
  analyse_resultat JSONB DEFAULT '{}',
  -- Structure: { description, categorie, surfaceEstimee, travaux: [{ designation, quantite, unite, prixEstime }], confiance: 0-100 }

  devis_genere_id UUID REFERENCES devis(id) ON DELETE SET NULL,
  statut TEXT NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'terminee', 'erreur', 'appliquee')),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ia_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own ia analyses"
ON ia_analyses
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ia_analyses_user
ON ia_analyses(user_id, created_at DESC);

COMMENT ON TABLE ia_analyses IS 'AI-assisted analysis results from photos for automatic quote generation';

-- ============================================================================
-- CARNETS D'ENTRETIEN: Building maintenance logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS carnets_entretien (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id UUID REFERENCES chantiers(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  nom TEXT NOT NULL,
  adresse TEXT,
  type_bien TEXT DEFAULT 'maison' CHECK (type_bien IN ('maison', 'appartement', 'commerce', 'bureau', 'batiment', 'autre')),
  date_livraison DATE,

  -- Garanties
  garantie_decennale_fin DATE,
  garantie_biennale_fin DATE,
  garantie_parfait_achevement_fin DATE,

  notes TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE carnets_entretien ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own carnets"
ON carnets_entretien
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_carnets_user
ON carnets_entretien(user_id);

COMMENT ON TABLE carnets_entretien IS 'Building maintenance logs with warranty tracking and recurring task management';

-- ============================================================================
-- ENTRETIEN TACHES: Recurring maintenance tasks
-- ============================================================================

CREATE TABLE IF NOT EXISTS entretien_taches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carnet_id UUID NOT NULL REFERENCES carnets_entretien(id) ON DELETE CASCADE,

  designation TEXT NOT NULL,
  description TEXT,
  categorie TEXT DEFAULT 'general',
  -- Categories: chauffage, plomberie, electricite, toiture, facade, menuiserie, ventilation, general

  recurrence TEXT NOT NULL DEFAULT 'annuel' CHECK (recurrence IN ('mensuel', 'trimestriel', 'semestriel', 'annuel', 'biennal', 'unique')),
  mois_prevu INTEGER CHECK (mois_prevu >= 1 AND mois_prevu <= 12),

  derniere_realisation DATE,
  prochaine_echeance DATE,
  cout_estime NUMERIC(10,2),

  statut TEXT NOT NULL DEFAULT 'a_faire' CHECK (statut IN ('a_faire', 'planifie', 'realise', 'reporte')),
  priorite INTEGER DEFAULT 2 CHECK (priorite >= 1 AND priorite <= 3),

  notes TEXT,

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE entretien_taches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own entretien tasks"
ON entretien_taches
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_entretien_taches_carnet
ON entretien_taches(carnet_id);

CREATE INDEX IF NOT EXISTS idx_entretien_taches_echeance
ON entretien_taches(prochaine_echeance)
WHERE statut NOT IN ('realise');

COMMENT ON TABLE entretien_taches IS 'Recurring maintenance tasks linked to a building maintenance log';

-- ============================================================================
-- SIGNATURES: Advanced electronic signatures
-- ============================================================================

CREATE TABLE IF NOT EXISTS signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('devis', 'facture', 'situation', 'rapport', 'commande')),

  signataire_nom TEXT NOT NULL,
  signataire_email TEXT,
  signataire_role TEXT DEFAULT 'client' CHECK (signataire_role IN ('client', 'artisan', 'sous_traitant', 'maitre_ouvrage')),

  signature_data TEXT NOT NULL, -- SVG path or base64 image
  ip_address TEXT,
  user_agent TEXT,

  date_signature TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hash_document TEXT, -- SHA256 of document at signing time

  statut TEXT NOT NULL DEFAULT 'signee' CHECK (statut IN ('en_attente', 'signee', 'refusee', 'expiree')),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own signatures"
ON signatures
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_signatures_document
ON signatures(document_id, document_type);

CREATE INDEX IF NOT EXISTS idx_signatures_user
ON signatures(user_id);

COMMENT ON TABLE signatures IS 'Electronic signature records with audit trail for legal compliance';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'ia_analyses'
  ) THEN
    RAISE EXCEPTION 'Table ia_analyses was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'carnets_entretien'
  ) THEN
    RAISE EXCEPTION 'Table carnets_entretien was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'entretien_taches'
  ) THEN
    RAISE EXCEPTION 'Table entretien_taches was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'signatures'
  ) THEN
    RAISE EXCEPTION 'Table signatures was not created';
  END IF;

  RAISE NOTICE 'Migration 013 completed successfully';
END $$;
