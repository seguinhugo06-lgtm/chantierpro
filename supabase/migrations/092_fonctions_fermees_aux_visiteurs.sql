-- ============================================================
-- Migration 092: fonctions et vue fermées aux visiteurs
-- ============================================================
-- Pourquoi : analyse de sécurité Supabase du 8 oct. 2026 (tâche rpc-ouvertes) et relectures gardien-securite
-- des 8 et 16 oct. (tâche org-fonctions). Relevé de production du 17 oct. 2026 :
--   - 26 fonctions SECURITY DEFINER exécutables par un visiteur (clé publique, sans compte), dont 11 à
--     identifiant libre : get_pending_reminders(p_user_id) rend les devis et factures non payés d'un compte
--     (numéro, montant, nom du client) ; get_weather_alerts et get_communication_stats ses chantiers et ses
--     envois ; user_org_ids, get_user_org_id, get_user_role, is_org_member son organisation et son rôle ;
--     get_user_plan, has_feature_access, check_plan_limit, count_user_resource son abonnement et ses volumes ;
--     needs_reminder lit un devis par son identifiant.
--   - la vue v_stock_alerts (droits du propriétaire, sans security_invoker) rend à un visiteur le catalogue en
--     rupture de TOUS les comptes, prix d'achat compris ; elle est aussi modifiable (anon=arwdDxtm, vue simple) :
--     un visiteur écrivait par elle dans le catalogue de n'importe quel compte (seconde relecture du 17 oct. 2026 ;
--     aucune trace d'abus relevée : 103 articles, tous rattachés à un compte connu) ;
--   - 16 fonctions SECURITY DEFINER sans search_path.
--   - ai_suggestions garde la policy « Service role can insert suggestions » (TO public, WITH CHECK (true)) :
--     un visiteur y glisse une fausse suggestion au nom de n'importe quel compte (relecture gardien-securite du
--     17 oct. 2026). Seul le code mort src/lib/stockAutoDeduction.js y insérait ; les comptes gardent leurs policies.
--     Et « Org members can insert ai_suggestions » laissait un compte insérer, dans son organisation, une ligne au
--     user_id d'un autre (qui la voit par « Users can view own suggestions »).
-- Qui les appelle (relevé du 17 oct. 2026) : user_org_ids, 121 policies, toutes TO authenticated et toutes
-- avec auth.uid() ; get_user_org_id, OrgContext avec l'identifiant du compte connecté ; get_user_plan et
-- count_user_resource, seulement des fonctions SECURITY DEFINER (enforce_plan_limit, check_plan_limit,
-- has_feature_access), qui s'exécutent en propriétaire. Aucune policy pour anon ou public, aucune vue, valeur
-- par défaut ni tâche cron n'appelle une fonction fermée ici ; aucun code (src/, fonctions Edge) n'appelle les
-- autres. Les pages publiques n'appellent que get_devis_for_signature, sign_devis, retracter_devis,
-- get_facture_for_payment et get_invitation_by_token (portal_* déjà fermées à tous).
-- Effet :
--   1. Un visiteur n'exécute plus que les cinq fonctions des pages publiques ; toute autre fonction SECURITY
--      DEFINER du schéma public lui est retirée, y compris celles absentes du dépôt. Les droits des comptes
--      connectés et du serveur sont recopiés explicitement avant de retirer PUBLIC (aucun ne se perd).
--   2. Les fonctions à identifiant libre sans appelant direct ne sont plus exécutables que par le serveur.
--   3. user_org_ids et get_user_org_id ne répondent plus que pour le compte connecté (le serveur, sans
--      compte, garde la réponse complète).
--   4. v_stock_alerts lit et écrit avec les droits de l'appelant (RLS du catalogue) ; plus aucun droit pour un visiteur.
--   5. search_path fixé sur toutes les fonctions SECURITY DEFINER du schéma public qui n'en avaient pas.
--   6. Une fonction créée plus tard dans public n'est plus exécutable par défaut par un visiteur : une page
--      publique qui en a besoin la lui accorde explicitement (GRANT EXECUTE … TO anon).
--   7. Plus d'insertion libre dans ai_suggestions, ni au nom d'un autre compte.
-- Hors de public : une fonction que postgres créerait dans un autre schéma n'est plus exécutable que par lui
-- (une policy qui l'appellerait échouerait en « permission denied », sans fuite) : lui accorder ses droits.
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   1) SELECT string_agg(p.proname, ', ' ORDER BY p.proname) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--        WHERE n.nspname = 'public' AND p.prosecdef AND has_function_privilege('anon', p.oid, 'EXECUTE');
--      attendu : get_devis_for_signature, get_facture_for_payment, get_invitation_by_token, retracter_devis, sign_devis
--   2) SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--        WHERE n.nspname = 'public' AND p.prosecdef AND p.proconfig IS NULL;
--      attendu : 0
--   3) SELECT has_table_privilege('anon', 'public.v_stock_alerts', 'SELECT');
--      attendu : false
--   4) SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_suggestions'
--        AND (with_check = 'true' OR (cmd = 'INSERT' AND with_check NOT LIKE '%auth.uid()%user_id%' AND with_check NOT LIKE '%user_id = auth.uid()%'));
--      attendu : 0
--   5) SELECT has_function_privilege('authenticated', 'public.user_org_ids(uuid)', 'EXECUTE');
--      attendu : true (sinon les 121 policies d'organisation cassent toute l'application)
--   6) SELECT coalesce(n.nspname, '(global)') || ' ' || d.defaclacl::text FROM pg_default_acl d LEFT JOIN pg_namespace n
--        ON n.oid = d.defaclnamespace WHERE d.defaclrole = 'postgres'::regrole AND d.defaclobjtype = 'f';
--      attendu : « (global) {postgres=X/postgres} » et la ligne de public sans anon
--   Puis, avec le compte de contrôle : la liste des devis ; en visiteur, une page de signature et une invitation.
-- ============================================================

-- 1. Visiteurs : seules les fonctions des pages publiques
DO $$
DECLARE
  f RECORD;
  publiques CONSTANT TEXT[] := ARRAY['get_devis_for_signature', 'sign_devis', 'retracter_devis', 'get_facture_for_payment', 'get_invitation_by_token'];
BEGIN
  FOR f IN
    SELECT p.oid, p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND p.prokind = 'f' AND NOT (p.proname = ANY (publiques))
      AND pg_has_role(current_user, p.proowner, 'MEMBER')
      -- pas les fonctions d'une extension
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
  LOOP
    -- Recopier d'abord les droits des comptes connectés et du serveur (ils peuvent ne venir que de PUBLIC)
    IF has_function_privilege('authenticated', f.oid, 'EXECUTE') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.sig);
    END IF;
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f.sig);
  END LOOP;
END $$;

-- 2. Identifiant libre, sans appelant direct : le serveur seul (les fonctions SECURITY DEFINER qui s'en
--    servent s'exécutent en propriétaire)
DO $$
DECLARE
  sig TEXT;
BEGIN
  FOREACH sig IN ARRAY ARRAY[
    'public.get_user_plan(uuid)', 'public.has_feature_access(uuid, text)', 'public.check_plan_limit(uuid, text)',
    'public.count_user_resource(uuid, text)', 'public.get_user_role(uuid, uuid)', 'public.is_org_member(uuid, uuid)',
    'public.get_pending_reminders(uuid, integer)', 'public.get_weather_alerts(uuid, integer)',
    'public.get_communication_stats(uuid, integer)', 'public.needs_reminder(uuid, integer)'
  ] LOOP
    IF to_regprocedure(sig) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', sig);
    END IF;
  END LOOP;
END $$;

-- 3. Organisation : la réponse du compte connecté seulement (policies : user_org_ids(auth.uid()))
CREATE OR REPLACE FUNCTION public.user_org_ids(p_user_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(ARRAY_AGG(organization_id), ARRAY[]::UUID[])
  FROM organization_members
  WHERE user_id = p_user_id AND (auth.uid() IS NULL OR p_user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.get_user_org_id(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN NULL;
  END IF;
  RETURN (SELECT organization_id FROM organization_members WHERE user_id = p_user_id ORDER BY joined_at ASC LIMIT 1);
END;
$$;

-- 4. Vue du stock : droits de l'appelant, plus de lecture anonyme
DO $$
BEGIN
  IF to_regclass('public.v_stock_alerts') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.v_stock_alerts SET (security_invoker = true)';
    EXECUTE 'REVOKE ALL ON public.v_stock_alerts FROM PUBLIC, anon';
  END IF;
END $$;

-- 5. search_path fixé partout
DO $$
DECLARE
  f RECORD;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND p.prokind = 'f' AND p.proconfig IS NULL
      AND pg_has_role(current_user, p.proowner, 'MEMBER')
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', f.sig);
  END LOOP;
END $$;

-- 7. Suggestions : plus d'insertion libre (les comptes gardent « Users can create own suggestions »), ni au nom
--    d'un autre compte de l'organisation
DO $$
BEGIN
  IF to_regclass('public.ai_suggestions') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert suggestions" ON public.ai_suggestions';
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_suggestions'
               AND policyname = 'Org members can insert ai_suggestions') THEN
      EXECUTE 'ALTER POLICY "Org members can insert ai_suggestions" ON public.ai_suggestions '
        || 'WITH CHECK (organization_id = ANY (public.user_org_ids(auth.uid())) AND user_id = auth.uid())';
    END IF;
  END IF;
END $$;

-- 6. Fonctions à venir : plus de droit implicite pour un visiteur (postgres applique les migrations et crée les
--    fonctions ; relevé du 17 oct. 2026). Le retrait de PUBLIC est global : un retrait limité à un schéma ne
--    peut pas retirer un droit accordé globalement.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
