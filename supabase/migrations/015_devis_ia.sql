-- ============================================================
-- Migration 015: Devis IA — Tables analyses + mémoire artisan
-- ============================================================

-- 1. Table analyses IA
CREATE TABLE IF NOT EXISTS ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id),
  input_type TEXT CHECK (input_type IN ('voice', 'text', 'photo')) NOT NULL,
  raw_input TEXT,
  cleaned_input TEXT,
  ai_response JSONB,
  confidence INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'completed', 'error')),
  linked_devis_id UUID,
  detected_location TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own analyses" ON ai_analyses
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_ai_analyses_user ON ai_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_created ON ai_analyses(user_id, created_at DESC);

-- 2. Table mémoire artisan IA
CREATE TABLE IF NOT EXISTS ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id),
  type TEXT CHECK (type IN ('preference', 'material', 'pricing', 'pattern')) NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, key)
);

ALTER TABLE ai_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own memory" ON ai_memory
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_ai_memory_user ON ai_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_memory_type ON ai_memory(user_id, type);
