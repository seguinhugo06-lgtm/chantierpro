-- ============================================================
-- Migration 075: Fermer deux tables ouvertes à tout le monde
-- ============================================================
-- La clé anon est publique (elle est dans le JavaScript du site). Deux policies donnaient donc
-- accès à n'importe qui sur Internet :
--
-- 1. payment_links — « Anon read payment_links by token » (migration 044) : FOR SELECT TO anon
--    USING (true) → TOUS les liens de paiement de TOUS les artisans (montants, factures, jetons)
--    lisibles d'une seule requête. Plus rien ne lit cette table : la page /pay/:token passe par
--    get_facture_for_payment et la fonction create-invoice-payment.
-- 2. portal_access_logs — « Service role can manage portal logs » (migration 007) : FOR ALL
--    USING (true) sans clause TO → lecture, écriture et suppression pour tous, adresses IP des
--    clients comprises. Le rôle de service n'a pas besoin de policy (il ignore RLS) ; les
--    insertions légitimes se font dans des fonctions SECURITY DEFINER (migration 011).
--    → l'artisan garde la lecture des journaux de SES clients.
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   SELECT tablename, policyname, roles, cmd, qual FROM pg_policies
--   WHERE tablename IN ('payment_links', 'portal_access_logs');
--     → plus aucune ligne avec qual = 'true'
--   Et, plus large, les policies encore ouvertes à tous :
--   SELECT tablename, policyname, roles, cmd FROM pg_policies
--   WHERE schemaname = 'public' AND (qual = 'true' OR with_check = 'true');
-- ============================================================

DO $$
BEGIN
  IF to_regclass('public.payment_links') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anon read payment_links by token" ON public.payment_links;
  END IF;

  IF to_regclass('public.portal_access_logs') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Service role can manage portal logs" ON public.portal_access_logs;
    DROP POLICY IF EXISTS "Artisans read their clients portal logs" ON public.portal_access_logs;
    IF to_regclass('public.clients') IS NOT NULL THEN
      CREATE POLICY "Artisans read their clients portal logs" ON public.portal_access_logs
        FOR SELECT TO authenticated
        USING (client_id IN (SELECT c.id FROM public.clients c WHERE c.user_id = auth.uid()));
    END IF;
  END IF;
END $$;
