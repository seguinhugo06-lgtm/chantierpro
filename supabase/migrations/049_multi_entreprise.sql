-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION 049: Multi-entreprise / Multi-site
--
-- Creates the `entreprises` table (plural) for structured multi-company
-- support. The old `entreprise` table (singular, settings_json blob)
-- remains intact during transition — data migrates programmatically.
--
-- Also adds `entreprise_id` FK on devis + chantiers, junction tables
-- for shared entities, RLS policies, indexes, and an atomic document
-- numbering function.
-- ═══════════════════════════════════════════════════════════════════════

-- ═══ Table entreprises ═══
CREATE TABLE IF NOT EXISTS entreprises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Identité
  nom TEXT NOT NULL,
  nom_court TEXT,
  slug TEXT,

  -- Visuel
  logo_url TEXT,
  logo_storage_path TEXT,
  couleur TEXT DEFAULT '#f97316',
  initiales TEXT,

  -- Coordonnées
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  pays TEXT DEFAULT 'FRANCE',
  telephone TEXT,
  email TEXT,
  site_web TEXT,
  slogan TEXT,

  -- Légal
  forme_juridique TEXT,
  capital TEXT,
  siret TEXT,
  code_ape TEXT,
  rcs TEXT,
  rcs_ville TEXT,
  tva_intra TEXT,

  -- Assurances
  assurance_decennale_numero TEXT,
  assurance_decennale_compagnie TEXT,
  assurance_decennale_validite DATE,
  assurance_rc_pro_numero TEXT,
  assurance_rc_pro_compagnie TEXT,
  assurance_rc_pro_validite DATE,

  -- Banque
  iban TEXT,
  bic TEXT,
  banque_nom TEXT,

  -- Paramètres métier (par entreprise)
  tva_defaut NUMERIC(5,2) DEFAULT 10,
  validite_devis INTEGER DEFAULT 30,
  delai_paiement INTEGER DEFAULT 30,
  acompte_defaut INTEGER DEFAULT 30,
  taux_frais_structure NUMERIC(5,2) DEFAULT 15,
  cgv TEXT,
  mention_devis TEXT,
  mention_facture TEXT,

  -- Numérotation
  prefixe_devis TEXT DEFAULT 'DEV',
  prefixe_facture TEXT DEFAULT 'FAC',
  prefixe_avoir TEXT DEFAULT 'AVC',
  compteur_devis INTEGER DEFAULT 0,
  compteur_facture INTEGER DEFAULT 0,
  compteur_avoir INTEGER DEFAULT 0,
  format_numero TEXT DEFAULT '{PREFIX}-{YEAR}-{NUMBER:5}',

  -- Statut
  is_active BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  ordre INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  archived_at TIMESTAMPTZ
);


-- ═══ Ajout entreprise_id sur devis + chantiers (nullable pour rétrocompat) ═══
ALTER TABLE devis ADD COLUMN IF NOT EXISTS entreprise_id UUID REFERENCES entreprises(id) ON DELETE SET NULL;
ALTER TABLE chantiers ADD COLUMN IF NOT EXISTS entreprise_id UUID REFERENCES entreprises(id) ON DELETE SET NULL;


-- ═══ Tables de liaison ═══
CREATE TABLE IF NOT EXISTS entreprise_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entreprise_id, client_id)
);

CREATE TABLE IF NOT EXISTS entreprise_employes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  employe_id UUID NOT NULL,
  organization_id UUID REFERENCES organizations(id),
  role_entreprise TEXT DEFAULT 'employe',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entreprise_id, employe_id)
);


-- ═══ Indexes ═══
CREATE INDEX IF NOT EXISTS idx_entreprises_org ON entreprises(organization_id);
CREATE INDEX IF NOT EXISTS idx_entreprises_user ON entreprises(user_id);
CREATE INDEX IF NOT EXISTS idx_entreprises_active ON entreprises(organization_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_devis_entreprise ON devis(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_chantiers_entreprise ON chantiers(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_ent_clients_ent ON entreprise_clients(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_ent_clients_client ON entreprise_clients(client_id);


-- ═══ RLS ═══
ALTER TABLE entreprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE entreprise_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE entreprise_employes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entreprises_org" ON entreprises
  FOR ALL USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT user_org_ids())
  );

CREATE POLICY "ent_clients_org" ON entreprise_clients
  FOR ALL USING (
    organization_id IN (SELECT user_org_ids())
    OR entreprise_id IN (SELECT id FROM entreprises WHERE user_id = auth.uid())
  );

CREATE POLICY "ent_employes_org" ON entreprise_employes
  FOR ALL USING (
    organization_id IN (SELECT user_org_ids())
    OR entreprise_id IN (SELECT id FROM entreprises WHERE user_id = auth.uid())
  );


-- ═══ Trigger updated_at ═══
CREATE OR REPLACE FUNCTION update_entreprises_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_entreprises_updated_at
  BEFORE UPDATE ON entreprises
  FOR EACH ROW EXECUTE FUNCTION update_entreprises_updated_at();


-- ═══ Fonction de numérotation atomique par entreprise ═══
-- Usage: SELECT fn_next_document_number('uuid-entreprise', 'devis');
-- Returns: 'DEV-2026-00001'
-- Uses FOR UPDATE to prevent race conditions on concurrent calls.
CREATE OR REPLACE FUNCTION fn_next_document_number(
  p_entreprise_id UUID,
  p_type TEXT  -- 'devis', 'facture', 'avoir'
) RETURNS TEXT AS $$
DECLARE
  v_ent entreprises%ROWTYPE;
  v_prefix TEXT;
  v_counter INTEGER;
  v_numero TEXT;
BEGIN
  -- Lock the row to prevent concurrent numbering issues
  SELECT * INTO v_ent FROM entreprises WHERE id = p_entreprise_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entreprise % not found', p_entreprise_id;
  END IF;

  CASE p_type
    WHEN 'devis' THEN
      v_prefix := COALESCE(v_ent.prefixe_devis, 'DEV');
      v_counter := COALESCE(v_ent.compteur_devis, 0) + 1;
      UPDATE entreprises SET compteur_devis = v_counter WHERE id = p_entreprise_id;
    WHEN 'facture' THEN
      v_prefix := COALESCE(v_ent.prefixe_facture, 'FAC');
      v_counter := COALESCE(v_ent.compteur_facture, 0) + 1;
      UPDATE entreprises SET compteur_facture = v_counter WHERE id = p_entreprise_id;
    WHEN 'avoir' THEN
      v_prefix := COALESCE(v_ent.prefixe_avoir, 'AVC');
      v_counter := COALESCE(v_ent.compteur_avoir, 0) + 1;
      UPDATE entreprises SET compteur_avoir = v_counter WHERE id = p_entreprise_id;
    ELSE
      RAISE EXCEPTION 'Invalid document type: %. Must be devis, facture, or avoir.', p_type;
  END CASE;

  v_numero := v_prefix || '-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(v_counter::TEXT, 5, '0');
  RETURN v_numero;
END;
$$ LANGUAGE plpgsql;
