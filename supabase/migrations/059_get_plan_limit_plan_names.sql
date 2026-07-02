-- ============================================================
-- Migration 059: get_plan_limit reconnaît gratuit/artisan/equipe
-- ============================================================
-- La fonction ne gérait que free/solo/pro : artisan & equipe retombaient sur
-- le défaut (5 devis = limite gratuite) → les clients PAYANTS étaient bloqués.
-- On réécrit avec les vraies limites (source: subscriptionStore.PLANS) + on
-- normalise les IDs legacy.

CREATE OR REPLACE FUNCTION get_plan_limit(p_plan text, p_resource text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $func$
DECLARE
  v_plan text;
BEGIN
  -- Normalise l'ID de plan (legacy → actuel)
  v_plan := CASE
    WHEN p_plan = 'artisan' THEN 'artisan'
    WHEN p_plan IN ('pro', 'entreprise', 'equipe') THEN 'equipe'
    ELSE 'gratuit'  -- gratuit / free / solo / decouverte / NULL
  END;

  RETURN CASE v_plan
    WHEN 'gratuit' THEN CASE p_resource
      WHEN 'devis' THEN 5
      WHEN 'clients' THEN 10
      WHEN 'chantiers' THEN 2
      WHEN 'catalogue' THEN 30
      WHEN 'signatures' THEN 0
      WHEN 'ia_analyses' THEN 3
      WHEN 'photos' THEN 50
      WHEN 'storage_mb' THEN 100
      WHEN 'equipe' THEN 1
      ELSE -1
    END
    WHEN 'artisan' THEN CASE p_resource
      WHEN 'ia_analyses' THEN 20
      WHEN 'storage_mb' THEN 2048
      WHEN 'equipe' THEN 1
      ELSE -1  -- devis / clients / chantiers / catalogue / signatures / photos illimités
    END
    ELSE CASE p_resource  -- equipe : tout illimité sauf équipe & stockage
      WHEN 'storage_mb' THEN 10240
      WHEN 'equipe' THEN 10
      ELSE -1
    END
  END;
END;
$func$;
