-- ============================================================
-- Migration 068: table audit_logs
-- ============================================================
-- `src/lib/auditService.js` écrit dans public.audit_logs à CHAQUE création,
-- modification et suppression, mais aucune migration ne créait la table.
-- Résultat en production : un 404 Supabase par action, en boucle, et un
-- historique d'entité vide alors que l'interface le propose.
--
-- Note : `organizations` / `organization_members` ne sont créées par AUCUNE
-- migration du dépôt (voir 066 qui les référence). Elles existent donc hors
-- migrations, ou pas du tout. Cette migration ne suppose ni l'une ni l'autre :
-- pas de clé étrangère vers organizations, et la clause multi-tenant n'est
-- ajoutée que si la table existe réellement.

-- 1. Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,               -- pas de FK : la table cible n'est pas garantie

  entity_type TEXT NOT NULL,          -- 'devis' | 'client' | 'chantier' | ...
  entity_id   TEXT NOT NULL,          -- TEXT : certaines entités ont un id non-UUID
  action      TEXT NOT NULL,          -- 'created' | 'updated' | 'deleted' | ...
  changes     JSONB,                  -- { champ: { avant, apres } }
  metadata    JSONB,
  snapshot_id UUID,
  user_name   TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Policies
DROP POLICY IF EXISTS "Users see own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users write own audit logs" ON audit_logs;

DO $$
DECLARE
  clause_org TEXT := '';
BEGIN
  -- Clause d'organisation ajoutée seulement si organization_members existe,
  -- sinon la policy serait invalide et la migration échouerait.
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'organization_members'
  ) THEN
    clause_org := ' OR organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())';
  END IF;

  EXECUTE format(
    'CREATE POLICY "Users see own audit logs" ON audit_logs FOR SELECT USING (user_id = auth.uid()%s)',
    clause_org
  );
  EXECUTE format(
    'CREATE POLICY "Users write own audit logs" ON audit_logs FOR INSERT WITH CHECK (user_id = auth.uid()%s)',
    clause_org
  );
END $$;

-- Un journal d'audit ne se modifie ni ne s'efface : aucune policy UPDATE/DELETE.
-- Sans elles, RLS refuse ces opérations, ce qui est le comportement voulu.

-- 4. Indexes — les deux seules requêtes de lecture du service
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
  ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id
  ON audit_logs(organization_id, created_at DESC);
