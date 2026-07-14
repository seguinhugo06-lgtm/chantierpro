-- ============================================================
-- Migration 063: table devis_templates (modèles perso)
-- ============================================================
-- La fonctionnalité « Vos modèles » (enregistrer/réutiliser un devis type)
-- écrit dans devis_templates, mais la table n'existait pas en prod → tout
-- enregistrement de modèle échouait silencieusement. On la crée, alignée
-- sur FIELD_MAPPINGS.devis_templates (useSupabaseSync.js).

CREATE TABLE IF NOT EXISTS devis_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  nom TEXT NOT NULL,
  description TEXT,
  categorie TEXT DEFAULT 'Mes modèles',
  lignes TEXT,                    -- JSON.stringify côté app
  tags TEXT[] DEFAULT '{}',
  source TEXT DEFAULT 'user',
  builtin_id TEXT,
  favori BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  prix_min NUMERIC,
  prix_max NUMERIC,
  marge_cible NUMERIC,
  tva_defaut NUMERIC DEFAULT 10,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE devis_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own templates" ON devis_templates;
CREATE POLICY "Users manage own templates" ON devis_templates
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_devis_templates_user ON devis_templates(user_id);

DROP TRIGGER IF EXISTS update_devis_templates_updated_at ON devis_templates;
CREATE TRIGGER update_devis_templates_updated_at BEFORE UPDATE ON devis_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
