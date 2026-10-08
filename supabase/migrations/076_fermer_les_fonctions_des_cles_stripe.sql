-- ============================================================
-- Migration 076: fermer les fonctions qui lisent les clés Stripe des artisans
-- ============================================================
-- Pourquoi : deux fonctions SECURITY DEFINER renvoient la clé Stripe SECRÈTE d'un artisan,
-- déchiffrée depuis Vault, pour l'identifiant d'utilisateur qu'on leur passe :
--   • get_stripe_secret_for_user (migration 029, effacée du dépôt par 227534e) : 029 a retiré le
--     droit à anon et à authenticated, mais PAS à PUBLIC — dont ces deux rôles font partie ;
--   • get_stripe_config_for_user (012) : 012 a retiré le droit à PUBLIC, mais Supabase accorde
--     par défaut l'exécution directement à anon et authenticated.
-- Dans les deux cas, n'importe quel visiteur muni de la clé publique (anon) peut, en principe,
-- appeler la fonction et lire la clé secrète d'un artisan dont il connaît l'identifiant.
-- Constaté sur le banc (PostgreSQL, droits par défaut de Supabase) ; à confirmer en production
-- avec la requête ci-dessous AVANT d'appliquer (colonnes visiteur / connecte à « t » = ouvert).
-- Effet : seules les fonctions serveur (rôle service_role) peuvent encore les appeler, ce que fait
-- déjà create-invoice-payment. Rien ne change pour l'artisan ni pour la page de paiement.
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   SELECT p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') AS visiteur, has_function_privilege('authenticated', p.oid, 'EXECUTE') AS connecte, has_function_privilege('service_role', p.oid, 'EXECUTE') AS serveur FROM pg_proc p WHERE p.proname IN ('get_stripe_secret_for_user', 'get_stripe_config_for_user');  -- visiteur f, connecte f, serveur t (aucune ligne : fonctions absentes, rien à fermer)
--   SELECT count(*) FILTER (WHERE stripe_enabled) AS cles_actives FROM public.stripe_config;  -- nombre de clés qui étaient exposées (0 : aucune)
-- ============================================================

-- Idempotente : ne touche que les fonctions qui existent ; rejouable sans danger.
DO $$
DECLARE
  f regprocedure;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('get_stripe_secret_for_user', 'get_stripe_config_for_user')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END $$;
