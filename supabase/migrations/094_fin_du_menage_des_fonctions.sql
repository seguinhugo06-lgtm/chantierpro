-- ============================================================
-- Migration 094: fin du ménage des fonctions
-- ============================================================
-- Pourquoi : analyse de sécurité Supabase après 092 (17 oct. 2026, tâche rpc-hygiene) :
--   - neuf fonctions ordinaires (non SECURITY DEFINER) du schéma public sans search_path (update_updated_at_column,
--     update_memos_updated_at, update_subscription_timestamp, retours_maj_updated_at, set_facture_payment_token,
--     get_recent_events, get_unread_suggestions_count, get_plan_limit, generate_recurring_previsions) : leur
--     résolution des noms dépend du search_path de l'appelant. Relevé : aucune n'appelle de fonction d'extension
--     (gen_random_uuid est intégrée à PostgreSQL) ;
--   - quatre fonctions de déclencheur SECURITY DEFINER (abonnement_lier_organisation, enforce_plan_limit,
--     handle_new_user_subscription, membre_proprietaire_coherent) encore exécutables par un compte connecté
--     (« can only be called as triggers » : sans danger, mais signalées) ; le droit EXECUTE d'une fonction de
--     déclencheur n'est vérifié qu'à la création du déclencheur, jamais à son exécution ;
--   - handle_new_user_subscription insérait le plan « free », renommé « gratuit » par 054 (aucun déclencheur ne
--     l'appelle en production : relevé du 17 oct. 2026).
-- Effet : search_path fixé sur toutes les fonctions du schéma public (hors extensions) ; fonctions de déclencheur
-- exécutables par personne en direct ; plan « gratuit » dans handle_new_user_subscription.
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   1) SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--        WHERE n.nspname = 'public' AND p.prokind = 'f' AND p.proconfig IS NULL
--          AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e');
--      attendu : 0
--   2) SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--        WHERE n.nspname = 'public' AND p.prosecdef AND p.prorettype = 'trigger'::regtype
--          AND (has_function_privilege('authenticated', p.oid, 'EXECUTE') OR has_function_privilege('anon', p.oid, 'EXECUTE'));
--      attendu : 0
-- ============================================================

-- 1. search_path fixé sur toutes les fonctions de la base (les SECURITY DEFINER l'ont depuis 092)
DO $$
DECLARE
  f RECORD;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f' AND p.proconfig IS NULL
      AND pg_has_role(current_user, p.proowner, 'MEMBER')
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', f.sig);
  END LOOP;
END $$;

-- 2. Fonctions de déclencheur SECURITY DEFINER : exécutables par personne en direct
DO $$
DECLARE
  f RECORD;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND p.prorettype = 'trigger'::regtype
      AND pg_has_role(current_user, p.proowner, 'MEMBER')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
  END LOOP;
END $$;

-- 3. Plan « gratuit » (054), pas « free »
DO $$
BEGIN
  IF to_regprocedure('public.handle_new_user_subscription()') IS NOT NULL THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, pg_temp
      AS $body$
      BEGIN
        INSERT INTO public.subscriptions (user_id, plan, status) VALUES (NEW.id, 'gratuit', 'active')
        ON CONFLICT (user_id) DO NOTHING;
        RETURN NEW;
      END;
      $body$;
    $f$;
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.handle_new_user_subscription() FROM PUBLIC, anon, authenticated';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
