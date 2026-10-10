-- ============================================================
-- Migration 082: fermer les fonctions du portail client
-- ============================================================
-- Pourquoi : relecture gardien-securite du 10 oct. 2026, constat en production (lecture seule) :
--   portal_accept_devis(uuid, uuid), portal_refuse_devis(uuid, uuid) et get_client_by_portal_token(uuid) (007)
--   sont SECURITY DEFINER, sans search_path, exécutables par anon et authenticated. 13 clients portent un
--   `portal_access_token` permanent, lisible par tout membre de l'organisation : un ancien collaborateur qui
--   garde un jeton et l'identifiant d'un devis le fait passer « accepté » sans signature, avec la clé publique ;
--   un devis sans client passe le contrôle (`NULL != x`). get_client_by_portal_token est cassée (colonnes absentes).
--   Le portail est éteint dans l'app (FONCTIONS.portailClient = false) et ne les appelle plus.
-- Effet : plus aucun visiteur ni compte connecté ne peut appeler ces fonctions (le rôle de service garde l'accès,
--   pour une reconstruction du portail : tâche [portail-client]). search_path fixé.
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   SELECT p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') AS anon,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') AS connecte, p.proconfig
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.proname IN ('portal_accept_devis','portal_refuse_devis','get_client_by_portal_token');
--   → anon = false, connecte = false, proconfig = {search_path=public, pg_temp} pour les trois.
-- ============================================================

DO $$
DECLARE
  f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.portal_accept_devis(uuid, uuid)',
    'public.portal_refuse_devis(uuid, uuid)',
    'public.get_client_by_portal_token(uuid)'
  ] LOOP
    IF to_regprocedure(f) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', f);
    END IF;
  END LOOP;
END $$;
