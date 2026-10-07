-- ============================================================
-- Migration 073: Abonnements — fermer l'auto-surclassement, partager le plan avec l'équipe
-- ============================================================
-- 1. FAILLE : la policy « Users update own subscription » (migration 004) laissait tout
--    utilisateur connecté modifier SA ligne d'abonnement depuis la console du navigateur
--    (clé anon publique + son jeton) : `update subscriptions set plan = 'equipe'` = plan payant
--    gratuit. Idem à l'insertion. Seuls le webhook Stripe et la fonction subscription-billing
--    doivent écrire un plan payant ; ils utilisent la clé de service, qui ignore les policies.
--    → plus de policy UPDATE ; l'INSERT n'accepte qu'une ligne « gratuit » sans identifiant Stripe.
-- 2. BUG : un collaborateur ne voyait pas l'abonnement de l'organisation (SELECT limité à
--    user_id = auth.uid()), retombait en « gratuit », et l'app lui créait une ligne gratuite
--    rattachée à l'organisation. → les membres lisent l'abonnement de leurs organisations, et
--    organization_id d'une ligne est toujours l'organisation que POSSÈDE son user_id (déclencheur).
-- 3. FUITE : get_org_subscription(p_org_id, p_user_id) (migration 040, SECURITY DEFINER) rendait
--    l'abonnement de n'importe quelle organisation à n'importe quel utilisateur connecté. Inutilisée
--    par l'app et les fonctions → exécution retirée.
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'subscriptions' ORDER BY cmd;
--     → pas de ligne UPDATE ; INSERT « Users insert own free subscription » ; deux SELECT.
--   SELECT count(*) FROM subscriptions s WHERE organization_id IS NOT NULL AND NOT EXISTS
--     (SELECT 1 FROM organizations o WHERE o.id = s.organization_id AND o.owner_id = s.user_id);  → 0
-- ============================================================

DO $$
BEGIN
  IF to_regclass('public.subscriptions') IS NULL THEN
    RAISE NOTICE 'Table subscriptions absente : migration 073 sans objet.';
    RETURN;
  END IF;

  -- 1. Écritures : plus d'UPDATE par l'utilisateur, INSERT limité au plan gratuit
  DROP POLICY IF EXISTS "Users update own subscription" ON public.subscriptions;
  DROP POLICY IF EXISTS "Users insert own subscription" ON public.subscriptions;
  DROP POLICY IF EXISTS "Users insert own free subscription" ON public.subscriptions;
  CREATE POLICY "Users insert own free subscription" ON public.subscriptions
    FOR INSERT TO authenticated
    WITH CHECK (
      auth.uid() = user_id
      AND coalesce(plan, 'gratuit') = 'gratuit'
      AND stripe_subscription_id IS NULL
      AND stripe_customer_id IS NULL
    );

  -- 2. Lecture par les membres de l'organisation (en plus de « Users view own subscription »)
  IF to_regclass('public.organization_members') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Members view organization subscription" ON public.subscriptions;
    CREATE POLICY "Members view organization subscription" ON public.subscriptions
      FOR SELECT TO authenticated
      USING (organization_id IN (SELECT m.organization_id FROM public.organization_members m WHERE m.user_id = auth.uid()));
  END IF;
END $$;

-- 2 bis. organization_id = l'organisation possédée par user_id (ou NULL), quelle que soit la source
CREATE OR REPLACE FUNCTION public.abonnement_lier_organisation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF to_regclass('public.organizations') IS NOT NULL THEN
    SELECT o.id INTO NEW.organization_id
    FROM public.organizations o
    WHERE o.owner_id = NEW.user_id
    ORDER BY o.created_at
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.subscriptions') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'organization_id') THEN
    DROP TRIGGER IF EXISTS trg_abonnement_lier_organisation ON public.subscriptions;
    CREATE TRIGGER trg_abonnement_lier_organisation
      BEFORE INSERT OR UPDATE OF user_id, organization_id ON public.subscriptions
      FOR EACH ROW EXECUTE FUNCTION public.abonnement_lier_organisation();

    -- Lignes existantes : rattacher celles des propriétaires, détacher celles des collaborateurs
    IF to_regclass('public.organizations') IS NOT NULL THEN
      UPDATE public.subscriptions s
        SET organization_id = NULL
        WHERE s.organization_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = s.organization_id AND o.owner_id = s.user_id);
      UPDATE public.subscriptions s
        SET organization_id = o.id
        FROM public.organizations o
        WHERE s.organization_id IS NULL AND o.owner_id = s.user_id;
    END IF;
  END IF;
END $$;

-- 3. Fonction qui exposait l'abonnement de n'importe quelle organisation
DO $$
BEGIN
  IF to_regprocedure('public.get_org_subscription(uuid, uuid)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.get_org_subscription(uuid, uuid) FROM PUBLIC, anon, authenticated;
  END IF;
END $$;
