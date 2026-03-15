-- 047_devis_templates.sql
-- Système de modèles de devis (templates) avec stockage DB
-- Permet de sauvegarder, partager et tracker l'utilisation des templates

-- ─── Table: devis_templates ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devis_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID,
  nom TEXT NOT NULL,
  description TEXT,
  categorie TEXT NOT NULL,
  lignes JSONB NOT NULL DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  source TEXT DEFAULT 'user' CHECK (source IN ('builtin', 'user', 'shared')),
  builtin_id TEXT,
  favori BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  prix_min NUMERIC,
  prix_max NUMERIC,
  marge_cible INTEGER,
  tva_defaut NUMERIC DEFAULT 10,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Table: template_usages ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS template_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID,
  template_id UUID REFERENCES devis_templates(id) ON DELETE SET NULL,
  template_builtin_id TEXT,
  devis_id UUID REFERENCES devis(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_devis_templates_user ON devis_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_devis_templates_org ON devis_templates(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devis_templates_categorie ON devis_templates(categorie);
CREATE INDEX IF NOT EXISTS idx_devis_templates_favori ON devis_templates(favori) WHERE favori = true;
CREATE INDEX IF NOT EXISTS idx_devis_templates_builtin ON devis_templates(builtin_id) WHERE builtin_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_template_usages_user ON template_usages(user_id);
CREATE INDEX IF NOT EXISTS idx_template_usages_template ON template_usages(template_id) WHERE template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_template_usages_builtin ON template_usages(template_builtin_id) WHERE template_builtin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_template_usages_used_at ON template_usages(used_at DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE devis_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own templates"
  ON devis_templates FOR ALL
  USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT user_org_ids())
  );

ALTER TABLE template_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own template usages"
  ON template_usages FOR ALL
  USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT user_org_ids())
  );

-- ─── Updated_at trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER set_devis_templates_updated_at
  BEFORE UPDATE ON devis_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
