-- ============================================================================
-- Migration 053: Garanties & Réception de chantier
-- ============================================================================
-- Gestion complète du cycle de vie post-travaux :
--   1. chantier_receptions    — PV de réception des travaux (avec/sans réserves)
--   2. reception_reserves     — Réserves émises lors de la réception
--   3. chantier_garanties     — Garanties légales (parfait achèvement, biennale,
--                               décennale) auto-générées à la réception
--   4. garantie_interventions — Interventions SAV / sinistres sous garantie
--
-- Inclut :
--   - Trigger de création automatique des 3 garanties légales à la réception
--   - Alertes d'expiration (90j, 30j, expiration)
--   - RLS organisation via profiles
--   - Indexes optimisés pour les requêtes courantes
-- ============================================================================

-- ─── Table 1 : chantier_receptions ──────────────────────────────────────────
-- PV de réception des travaux terminés

CREATE TABLE IF NOT EXISTS chantier_receptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  chantier_id UUID NOT NULL REFERENCES chantiers(id) ON DELETE CASCADE,
  date_reception DATE NOT NULL,
  type_reception TEXT NOT NULL DEFAULT 'sans_reserve'
    CHECK (type_reception IN ('sans_reserve', 'avec_reserves', 'refusee')),
  pv_signe BOOLEAN DEFAULT false,
  pv_document_url TEXT,
  signataire_client TEXT,
  signataire_entreprise TEXT,
  observations TEXT,
  date_levee_reserves DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chantier_id)
);

CREATE INDEX IF NOT EXISTS idx_reception_org
  ON chantier_receptions(organization_id);

CREATE INDEX IF NOT EXISTS idx_reception_chantier
  ON chantier_receptions(chantier_id);

-- ─── Table 2 : reception_reserves ───────────────────────────────────────────
-- Réserves émises lors de la réception des travaux

CREATE TABLE IF NOT EXISTS reception_reserves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reception_id UUID NOT NULL REFERENCES chantier_receptions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  description TEXT NOT NULL,
  localisation TEXT,
  priorite TEXT DEFAULT 'normale'
    CHECK (priorite IN ('mineure', 'normale', 'majeure')),
  statut TEXT DEFAULT 'ouverte'
    CHECK (statut IN ('ouverte', 'en_cours', 'levee')),
  date_levee DATE,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reserves_reception
  ON reception_reserves(reception_id);

-- ─── Table 3 : chantier_garanties ───────────────────────────────────────────
-- Garanties légales par chantier (auto-générées à la réception)

CREATE TABLE IF NOT EXISTS chantier_garanties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  chantier_id UUID NOT NULL REFERENCES chantiers(id) ON DELETE CASCADE,
  reception_id UUID NOT NULL REFERENCES chantier_receptions(id),
  type_garantie TEXT NOT NULL
    CHECK (type_garantie IN ('parfait_achevement', 'biennale', 'decennale')),
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  statut TEXT DEFAULT 'active'
    CHECK (statut IN ('active', 'expiree', 'en_litige')),
  assureur TEXT,
  numero_police TEXT,
  montant_couvert DECIMAL(12,2),
  notes TEXT,
  alerte_envoyee_90j BOOLEAN DEFAULT false,
  alerte_envoyee_30j BOOLEAN DEFAULT false,
  alerte_envoyee_expiration BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chantier_id, type_garantie)
);

CREATE INDEX IF NOT EXISTS idx_garanties_org
  ON chantier_garanties(organization_id);

CREATE INDEX IF NOT EXISTS idx_garanties_chantier
  ON chantier_garanties(chantier_id);

CREATE INDEX IF NOT EXISTS idx_garanties_expiration
  ON chantier_garanties(date_fin)
  WHERE statut = 'active';

-- ─── Table 4 : garantie_interventions ───────────────────────────────────────
-- Interventions SAV et sinistres sous garantie

CREATE TABLE IF NOT EXISTS garantie_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  garantie_id UUID NOT NULL REFERENCES chantier_garanties(id),
  chantier_id UUID NOT NULL REFERENCES chantiers(id),
  date_signalement DATE NOT NULL,
  date_intervention DATE,
  date_cloture DATE,
  description TEXT NOT NULL,
  type_desordre TEXT,
  localisation TEXT,
  statut TEXT DEFAULT 'signale'
    CHECK (statut IN ('signale', 'planifie', 'en_cours', 'cloture', 'refuse')),
  prise_en_charge TEXT DEFAULT 'garantie'
    CHECK (prise_en_charge IN ('garantie', 'hors_garantie', 'a_determiner')),
  cout_intervention DECIMAL(10,2) DEFAULT 0,
  photos JSONB DEFAULT '[]'::jsonb,
  rapport TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interventions_garantie
  ON garantie_interventions(garantie_id);

CREATE INDEX IF NOT EXISTS idx_interventions_chantier
  ON garantie_interventions(chantier_id);

CREATE INDEX IF NOT EXISTS idx_interventions_statut
  ON garantie_interventions(statut);

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE chantier_receptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reception_reserves ENABLE ROW LEVEL SECURITY;
ALTER TABLE chantier_garanties ENABLE ROW LEVEL SECURITY;
ALTER TABLE garantie_interventions ENABLE ROW LEVEL SECURITY;

-- chantier_receptions
CREATE POLICY "receptions_select" ON chantier_receptions FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "receptions_insert" ON chantier_receptions FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "receptions_update" ON chantier_receptions FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "receptions_delete" ON chantier_receptions FOR DELETE TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  );

-- reception_reserves
CREATE POLICY "reserves_select" ON reception_reserves FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "reserves_insert" ON reception_reserves FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "reserves_update" ON reception_reserves FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "reserves_delete" ON reception_reserves FOR DELETE TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  );

-- chantier_garanties
CREATE POLICY "garanties_select" ON chantier_garanties FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "garanties_insert" ON chantier_garanties FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "garanties_update" ON chantier_garanties FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "garanties_delete" ON chantier_garanties FOR DELETE TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  );

-- garantie_interventions
CREATE POLICY "interventions_select" ON garantie_interventions FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "interventions_insert" ON garantie_interventions FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "interventions_update" ON garantie_interventions FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "interventions_delete" ON garantie_interventions FOR DELETE TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  );

-- ─── Triggers : updated_at ──────────────────────────────────────────────────

-- Réutilise la fonction existante update_updated_at_column()
-- (définie dans 000_create_tables.sql), avec CREATE OR REPLACE par sécurité

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chantier_receptions_updated_at
  BEFORE UPDATE ON chantier_receptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reception_reserves_updated_at
  BEFORE UPDATE ON reception_reserves
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chantier_garanties_updated_at
  BEFORE UPDATE ON chantier_garanties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_garantie_interventions_updated_at
  BEFORE UPDATE ON garantie_interventions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Trigger : création automatique des garanties à la réception ────────────
-- Insère automatiquement les 3 garanties légales françaises :
--   - Garantie de parfait achèvement : 1 an
--   - Garantie biennale (bon fonctionnement) : 2 ans
--   - Garantie décennale : 10 ans

CREATE OR REPLACE FUNCTION create_garanties_on_reception()
RETURNS TRIGGER AS $$
BEGIN
  -- Ne créer les garanties que si la réception n'est pas refusée
  IF NEW.type_reception = 'refusee' THEN
    RETURN NEW;
  END IF;

  -- Garantie de parfait achèvement (1 an)
  INSERT INTO chantier_garanties (
    organization_id, chantier_id, reception_id,
    type_garantie, date_debut, date_fin
  ) VALUES (
    NEW.organization_id, NEW.chantier_id, NEW.id,
    'parfait_achevement',
    NEW.date_reception,
    NEW.date_reception + INTERVAL '1 year'
  ) ON CONFLICT (chantier_id, type_garantie) DO NOTHING;

  -- Garantie biennale (2 ans)
  INSERT INTO chantier_garanties (
    organization_id, chantier_id, reception_id,
    type_garantie, date_debut, date_fin
  ) VALUES (
    NEW.organization_id, NEW.chantier_id, NEW.id,
    'biennale',
    NEW.date_reception,
    NEW.date_reception + INTERVAL '2 years'
  ) ON CONFLICT (chantier_id, type_garantie) DO NOTHING;

  -- Garantie décennale (10 ans)
  INSERT INTO chantier_garanties (
    organization_id, chantier_id, reception_id,
    type_garantie, date_debut, date_fin
  ) VALUES (
    NEW.organization_id, NEW.chantier_id, NEW.id,
    'decennale',
    NEW.date_reception,
    NEW.date_reception + INTERVAL '10 years'
  ) ON CONFLICT (chantier_id, type_garantie) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_create_garanties_on_reception
  AFTER INSERT ON chantier_receptions
  FOR EACH ROW EXECUTE FUNCTION create_garanties_on_reception();
