-- Migration 052: Carnet d'adresses sous-traitants enrichi
-- 4 tables: subcontractors, subcontractor_reviews, chantier_subcontractors, subcontractor_documents
-- Rating trigger, compliance scoring, document management

-- ─── Table: subcontractors ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identité
  nom TEXT NOT NULL,
  prenom TEXT,
  entreprise TEXT,
  role_poste TEXT,
  type_contrat TEXT DEFAULT 'Auto-entrepreneur',
  telephone TEXT,
  email TEXT,
  siret TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  site_web TEXT,
  photo_url TEXT,

  -- Compétences & certifications
  competences TEXT[] DEFAULT '{}',
  certifications JSONB DEFAULT '[]'::jsonb,
  -- Format: [{"nom":"CACES R489","date_obtention":"2024-01-15","date_expiration":"2026-06-30","organisme":"AFPA","numero":"CERT-123"}]
  notes TEXT,

  -- Tarification
  mode_tarification TEXT DEFAULT 'horaire' CHECK (mode_tarification IN ('horaire', 'forfait')),
  taux_horaire DECIMAL(10,2),
  cout_horaire_charge DECIMAL(10,2),
  tarif_forfait DECIMAL(12,2),

  -- Assurance décennale
  assureur_decennale TEXT,
  numero_police_decennale TEXT,
  expiration_decennale DATE,

  -- RC Professionnelle
  assureur_rc_pro TEXT,
  numero_police_rc_pro TEXT,
  expiration_rc_pro DATE,
  montant_garantie_rc_pro DECIMAL(12,2),

  -- Vigilance URSSAF
  derniere_verification_urssaf DATE,
  numero_attestation_urssaf TEXT,

  -- Évaluation globale (calculée par trigger)
  note_moyenne DECIMAL(3,2) DEFAULT 0,
  nombre_evaluations INTEGER DEFAULT 0,

  -- Statut
  statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif', 'bloque', 'favori')),
  date_premiere_collaboration DATE,
  is_archived BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subcontractors_org ON subcontractors(organization_id, is_archived, statut);
CREATE INDEX IF NOT EXISTS idx_subcontractors_competences ON subcontractors USING GIN(competences);
CREATE INDEX IF NOT EXISTS idx_subcontractors_note ON subcontractors(organization_id, note_moyenne DESC);
CREATE INDEX IF NOT EXISTS idx_subcontractors_expiration ON subcontractors(organization_id, expiration_decennale, expiration_rc_pro);
CREATE INDEX IF NOT EXISTS idx_subcontractors_user ON subcontractors(user_id);

-- ─── Table: subcontractor_reviews ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subcontractor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  chantier_id UUID REFERENCES chantiers(id) ON DELETE SET NULL,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notes par critère (1 à 5)
  note_qualite INTEGER NOT NULL CHECK (note_qualite BETWEEN 1 AND 5),
  note_delais INTEGER NOT NULL CHECK (note_delais BETWEEN 1 AND 5),
  note_prix INTEGER NOT NULL CHECK (note_prix BETWEEN 1 AND 5),
  note_communication INTEGER NOT NULL CHECK (note_communication BETWEEN 1 AND 5),
  note_proprete INTEGER NOT NULL CHECK (note_proprete BETWEEN 1 AND 5),

  -- Note globale calculée
  note_globale DECIMAL(3,2) GENERATED ALWAYS AS (
    (note_qualite + note_delais + note_prix + note_communication + note_proprete)::decimal / 5
  ) STORED,

  commentaire TEXT,
  recommande BOOLEAN DEFAULT TRUE,
  date_evaluation DATE DEFAULT CURRENT_DATE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_subcontractor ON subcontractor_reviews(subcontractor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_chantier ON subcontractor_reviews(chantier_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique ON subcontractor_reviews(subcontractor_id, chantier_id, reviewer_id);

-- ─── Table: chantier_subcontractors ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chantier_subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  chantier_id UUID NOT NULL REFERENCES chantiers(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,

  role_sur_chantier TEXT,
  date_debut DATE,
  date_fin DATE,
  montant_prevu DECIMAL(12,2),
  montant_facture DECIMAL(12,2) DEFAULT 0,
  statut TEXT DEFAULT 'affecte' CHECK (statut IN ('affecte', 'en_cours', 'termine', 'annule')),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(chantier_id, subcontractor_id)
);

CREATE INDEX IF NOT EXISTS idx_chantier_sub_chantier ON chantier_subcontractors(chantier_id);
CREATE INDEX IF NOT EXISTS idx_chantier_sub_subcontractor ON chantier_subcontractors(subcontractor_id);

-- ─── Table: subcontractor_documents ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subcontractor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN (
    'attestation_urssaf', 'attestation_decennale', 'attestation_rc_pro',
    'contrat_sous_traitance', 'kbis', 'rib', 'autre'
  )),
  nom TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  storage_path TEXT,
  file_size INTEGER,
  mime_type TEXT,
  date_emission DATE,
  date_expiration DATE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_docs ON subcontractor_documents(subcontractor_id, type);
CREATE INDEX IF NOT EXISTS idx_sub_docs_expiration ON subcontractor_documents(organization_id, date_expiration)
  WHERE date_expiration IS NOT NULL;

-- ─── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontractor_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE chantier_subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontractor_documents ENABLE ROW LEVEL SECURITY;

-- Subcontractors: org-scoped or user-scoped fallback
CREATE POLICY subcontractors_select ON subcontractors FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT unnest(user_org_ids()))
    OR user_id = auth.uid()
  );

CREATE POLICY subcontractors_insert ON subcontractors FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY subcontractors_update ON subcontractors FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT unnest(user_org_ids()))
    OR user_id = auth.uid()
  );

CREATE POLICY subcontractors_delete ON subcontractors FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Reviews
CREATE POLICY reviews_select ON subcontractor_reviews FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT unnest(user_org_ids()))
  );

CREATE POLICY reviews_insert ON subcontractor_reviews FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY reviews_update ON subcontractor_reviews FOR UPDATE TO authenticated
  USING (reviewer_id = auth.uid());

-- Chantier subcontractors
CREATE POLICY chantier_sub_select ON chantier_subcontractors FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT unnest(user_org_ids()))
  );

CREATE POLICY chantier_sub_insert ON chantier_subcontractors FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT unnest(user_org_ids()))
  );

CREATE POLICY chantier_sub_update ON chantier_subcontractors FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT unnest(user_org_ids()))
  );

CREATE POLICY chantier_sub_delete ON chantier_subcontractors FOR DELETE TO authenticated
  USING (
    organization_id IN (SELECT unnest(user_org_ids()))
  );

-- Documents
CREATE POLICY sub_docs_select ON subcontractor_documents FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT unnest(user_org_ids()))
  );

CREATE POLICY sub_docs_insert ON subcontractor_documents FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT unnest(user_org_ids()))
  );

CREATE POLICY sub_docs_delete ON subcontractor_documents FOR DELETE TO authenticated
  USING (
    organization_id IN (SELECT unnest(user_org_ids()))
  );

-- ─── Triggers ──────────────────────────────────────────────────────────────────

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_subcontractor_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_subcontractors_updated
  BEFORE UPDATE ON subcontractors
  FOR EACH ROW EXECUTE FUNCTION update_subcontractor_timestamp();

CREATE TRIGGER trg_chantier_sub_updated
  BEFORE UPDATE ON chantier_subcontractors
  FOR EACH ROW EXECUTE FUNCTION update_subcontractor_timestamp();

-- Recalculate note_moyenne + nombre_evaluations after review changes
CREATE OR REPLACE FUNCTION update_subcontractor_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_sub_id UUID;
BEGIN
  v_sub_id := COALESCE(NEW.subcontractor_id, OLD.subcontractor_id);

  UPDATE subcontractors
  SET
    note_moyenne = (
      SELECT COALESCE(AVG(note_globale), 0)
      FROM subcontractor_reviews
      WHERE subcontractor_id = v_sub_id
    ),
    nombre_evaluations = (
      SELECT COUNT(*)
      FROM subcontractor_reviews
      WHERE subcontractor_id = v_sub_id
    ),
    updated_at = NOW()
  WHERE id = v_sub_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_rating
  AFTER INSERT OR UPDATE OR DELETE ON subcontractor_reviews
  FOR EACH ROW EXECUTE FUNCTION update_subcontractor_rating();

-- ─── RPC: Get subcontractor statistics ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_subcontractor_stats(p_org_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_actifs', (SELECT COUNT(*) FROM subcontractors WHERE organization_id = p_org_id AND NOT is_archived AND statut IN ('actif', 'favori')),
    'cout_moyen', (SELECT COALESCE(AVG(taux_horaire), 0) FROM subcontractors WHERE organization_id = p_org_id AND NOT is_archived AND taux_horaire > 0),
    'decennales_valides', (SELECT COUNT(*) FROM subcontractors WHERE organization_id = p_org_id AND NOT is_archived AND expiration_decennale > CURRENT_DATE),
    'decennales_total', (SELECT COUNT(*) FROM subcontractors WHERE organization_id = p_org_id AND NOT is_archived AND expiration_decennale IS NOT NULL),
    'urssaf_ok', (SELECT COUNT(*) FROM subcontractors WHERE organization_id = p_org_id AND NOT is_archived AND derniere_verification_urssaf > (CURRENT_DATE - INTERVAL '6 months')),
    'urssaf_total', (SELECT COUNT(*) FROM subcontractors WHERE organization_id = p_org_id AND NOT is_archived AND derniere_verification_urssaf IS NOT NULL),
    'note_moyenne_globale', (SELECT COALESCE(AVG(note_moyenne), 0) FROM subcontractors WHERE organization_id = p_org_id AND NOT is_archived AND nombre_evaluations > 0),
    'total_facture', (SELECT COALESCE(SUM(montant_facture), 0) FROM chantier_subcontractors WHERE organization_id = p_org_id),
    'expiring_30_days', (SELECT COUNT(*) FROM subcontractors WHERE organization_id = p_org_id AND NOT is_archived AND (
      (expiration_decennale BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days')
      OR (expiration_rc_pro BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days')
    ))
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_subcontractor_stats(UUID) TO authenticated;
