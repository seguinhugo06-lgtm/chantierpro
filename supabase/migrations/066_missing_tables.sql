-- ============================================================
-- Migration 066 : tables mappées côté code mais absentes en prod
-- Trouvées lors du balayage schéma (14 juil. 2026). Créées selon les
-- conventions du projet (RLS multi-tenant user_id OR organization_id,
-- index user_id + org). Idempotent. Appliqué en prod via l'API management.
-- ============================================================

-- ── tresorerie_mouvements (soeur de tresorerie_previsions) ──
CREATE TABLE IF NOT EXISTS tresorerie_mouvements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  description TEXT,
  montant NUMERIC,
  date DATE,
  type TEXT DEFAULT 'sortie',
  categorie TEXT,
  statut TEXT DEFAULT 'prevu',
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency TEXT,
  recurring_end_date DATE,
  parent_recurring_id UUID,
  devis_id UUID,
  chantier_id UUID,
  client_id UUID,
  depense_id UUID,
  montant_ht NUMERIC,
  taux_tva NUMERIC DEFAULT 20,
  montant_tva NUMERIC,
  autoliquidation BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tresorerie_mouvements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own tresorerie_mouvements" ON tresorerie_mouvements;
CREATE POLICY "Users see own tresorerie_mouvements" ON tresorerie_mouvements
  FOR ALL USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_tresorerie_mouvements_user_id ON tresorerie_mouvements(user_id);
CREATE INDEX IF NOT EXISTS idx_tresorerie_mouvements_org_id ON tresorerie_mouvements(organization_id);
CREATE INDEX IF NOT EXISTS idx_tresorerie_mouvements_date ON tresorerie_mouvements(date);

DROP TRIGGER IF EXISTS update_tresorerie_mouvements_updated_at ON tresorerie_mouvements;
CREATE TRIGGER update_tresorerie_mouvements_updated_at BEFORE UPDATE ON tresorerie_mouvements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── template_usages (suivi d'usage des modèles de devis) ──
CREATE TABLE IF NOT EXISTS template_usages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  template_id UUID,
  template_builtin_id TEXT,
  devis_id UUID,
  used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE template_usages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own template_usages" ON template_usages;
CREATE POLICY "Users see own template_usages" ON template_usages
  FOR ALL USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_template_usages_user_id ON template_usages(user_id);
CREATE INDEX IF NOT EXISTS idx_template_usages_template_id ON template_usages(template_id);

NOTIFY pgrst, 'reload schema';
