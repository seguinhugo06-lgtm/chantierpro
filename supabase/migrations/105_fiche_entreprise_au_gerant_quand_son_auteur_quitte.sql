-- ============================================================
-- Migration 105: la fiche entreprise passe au patron quand son auteur quitte l'équipe
-- ============================================================
-- Pourquoi : relecture gardien-securite du 24 oct. 2026 (MOYENNE, en production), constat au banc le même jour.
--   Retirer un membre (DELETE dans organization_members, 078) ne réattribue rien, et « Users can update own
--   entreprise » (002) ne contrôle que user_id : un ancien administrateur qui a créé la fiche entreprise de
--   l'organisation la modifie encore (IBAN, nom, e-mail de réponse, mentions imprimées sur les devis et factures),
--   la lit (« Users can view own entreprise »), et garde le journal des relances et les exclusions écrits à son nom.
--   Or send-scheduled-relances lit et écrit ce journal et ces exclusions au nom de l'auteur de la fiche : l'ancien
--   membre pouvait effacer une ligne du journal (la relance déjà envoyée repartait au client) ou écrire un faux
--   « déjà relancé » (la relance ne partait plus). Le contrôle de 084 n'agit que si organization_id change. Même
--   chose pour un administrateur rétrogradé, qui gardait la main sur la fiche malgré son nouveau rôle.
--
-- Effet :
--   1. quand un membre quitte l'équipe (retrait par le patron, ou par le serveur) ou n'y est plus gérant
--      (administrateur rétrogradé), les fiches entreprise qu'il a créées dans cette organisation passent au
--      propriétaire de l'organisation, avec son journal de relances et ses exclusions dans cette organisation : la
--      relance automatique suit alors le patron. Le membre garde ce qui est à lui dans ses autres organisations ;
--   2. rattrapage, rejouable : une fiche dont l'auteur n'est plus gérant de son organisation passe au propriétaire
--      (aucune le 24 oct. 2026 : 4 fiches, toutes créées par le propriétaire), de même que le journal et les
--      exclusions d'un ancien membre ;
--   3. la fiche d'une organisation ne se lit plus qu'en membre et ne se modifie plus qu'en propriétaire ou
--      administrateur, même par son auteur ; une fiche sans organisation reste à son auteur ;
--   4. une fiche ne change plus d'organisation depuis l'app (l'app n'écrit l'organisation qu'à la création) : un
--      gérant ne la sort plus de l'organisation avant de partir pour la garder.
--   Rien ne change pour un artisan seul ni pour le patron. Limite connue, inchangée : la relance automatique ne suit
--   que les documents de l'auteur de la fiche ; après un départ, ce sont ceux du patron.
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   1) Déclencheurs — attendu 2 lignes :
--   SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgname IN ('trg_fiche_au_gerant_au_depart', 'trg_fiche_reste_dans_son_organisation') ORDER BY 1;
--   2) Policies « Users can … own entreprise » — attendu : view avec mon_role_organisation(organization_id) IS NOT NULL,
--      update avec mon_role_organisation(organization_id) = ANY (ARRAY['owner', 'admin']) dans qual ET with_check :
--   SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public' AND tablename = 'entreprise' AND policyname LIKE 'Users can %' ORDER BY 1;
--   3) Plus aucune fiche dont l'auteur n'est pas gérant de son organisation — attendu 0 :
--   SELECT count(*) FROM public.entreprise e WHERE e.organization_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = e.organization_id AND m.user_id = e.user_id AND m.role IN ('owner', 'admin'));
--   4) La réattribution n'est exécutable par personne d'autre que le serveur — attendu f, f :
--   SELECT has_function_privilege('anon', 'public.fiche_rendue_au_proprietaire(uuid, uuid)', 'execute') AS visiteur, has_function_privilege('authenticated', 'public.fiche_rendue_au_proprietaire(uuid, uuid)', 'execute') AS connecte;
-- ============================================================

-- Idempotente : CREATE OR REPLACE, DROP … IF EXISTS ; rejouable sans danger (le rattrapage ne touche que ce qui
-- est encore à réattribuer).

-- 1. Rendre au propriétaire de l'organisation la fiche d'un auteur qui n'y est plus gérant, avec ce que la relance
--    automatique lit au nom de l'auteur de la fiche (journal, exclusions). Interne : appelée par le déclencheur et
--    le rattrapage ci-dessous, jamais par un client (identifiants libres).
CREATE OR REPLACE FUNCTION public.fiche_rendue_au_proprietaire(p_org UUID, p_auteur UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_proprietaire UUID;
BEGIN
  SELECT o.owner_id INTO v_proprietaire FROM public.organizations o WHERE o.id = p_org;
  -- Organisation en cours de suppression (sa fiche part avec elle), ou départ du propriétaire lui-même : rien à faire
  IF v_proprietaire IS NULL OR p_auteur IS NULL OR v_proprietaire = p_auteur THEN
    RETURN;
  END IF;
  UPDATE public.entreprise SET user_id = v_proprietaire WHERE organization_id = p_org AND user_id = p_auteur;
  IF to_regclass('public.relance_executions') IS NOT NULL THEN
    UPDATE public.relance_executions SET user_id = v_proprietaire WHERE organization_id = p_org AND user_id = p_auteur;
  END IF;
  IF to_regclass('public.relance_exclusions') IS NOT NULL THEN
    UPDATE public.relance_exclusions SET user_id = v_proprietaire WHERE organization_id = p_org AND user_id = p_auteur;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.fiche_rendue_au_proprietaire(UUID, UUID) FROM PUBLIC, anon, authenticated;

-- 2. Au départ d'un membre, ou quand il n'est plus gérant. SECURITY DEFINER : le patron qui retire un membre n'a pas
--    accès au journal de relances écrit au nom de ce membre (policies par compte).
CREATE OR REPLACE FUNCTION public.fiche_au_gerant_au_depart()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.fiche_rendue_au_proprietaire(OLD.organization_id, OLD.user_id);
  ELSIF OLD.role IN ('owner', 'admin') AND NEW.role NOT IN ('owner', 'admin') THEN
    PERFORM public.fiche_rendue_au_proprietaire(OLD.organization_id, OLD.user_id);
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.fiche_au_gerant_au_depart() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF to_regclass('public.organization_members') IS NULL THEN RETURN; END IF;
  DROP TRIGGER IF EXISTS trg_fiche_au_gerant_au_depart ON public.organization_members;
  CREATE TRIGGER trg_fiche_au_gerant_au_depart
    AFTER DELETE OR UPDATE OF role ON public.organization_members
    FOR EACH ROW EXECUTE FUNCTION public.fiche_au_gerant_au_depart();
END $$;

-- 3. Une fiche ne quitte pas son organisation depuis l'app (le serveur n'est pas concerné) : sinon un gérant la
--    passait sans organisation, ou dans son organisation personnelle, et la gardait après son départ.
CREATE OR REPLACE FUNCTION public.fiche_reste_dans_son_organisation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND OLD.organization_id IS NOT NULL
     AND NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'Une fiche entreprise ne change pas d''organisation' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.fiche_reste_dans_son_organisation() FROM PUBLIC, anon, authenticated;

-- 4. La fiche d'une organisation : lue par ses membres, modifiée par ses gérants, même par son auteur ; une fiche
--    sans organisation reste à son auteur. Les policies « Org … entreprise » (084) sont inchangées.
DO $$
BEGIN
  IF to_regclass('public.entreprise') IS NULL THEN RETURN; END IF;
  DROP TRIGGER IF EXISTS trg_fiche_reste_dans_son_organisation ON public.entreprise;
  CREATE TRIGGER trg_fiche_reste_dans_son_organisation
    BEFORE UPDATE OF organization_id ON public.entreprise
    FOR EACH ROW EXECUTE FUNCTION public.fiche_reste_dans_son_organisation();

  DROP POLICY IF EXISTS "Users can view own entreprise" ON public.entreprise;
  CREATE POLICY "Users can view own entreprise" ON public.entreprise FOR SELECT TO authenticated
    USING (user_id = auth.uid()
           AND (organization_id IS NULL OR public.mon_role_organisation(organization_id) IS NOT NULL));
  DROP POLICY IF EXISTS "Users can update own entreprise" ON public.entreprise;
  CREATE POLICY "Users can update own entreprise" ON public.entreprise FOR UPDATE TO authenticated
    USING (user_id = auth.uid()
           AND (organization_id IS NULL OR public.mon_role_organisation(organization_id) IN ('owner', 'admin')))
    WITH CHECK (user_id = auth.uid()
                AND (organization_id IS NULL OR public.mon_role_organisation(organization_id) IN ('owner', 'admin')));
END $$;

-- 5. Rattrapage : fiches dont l'auteur n'est plus gérant de leur organisation, puis journal et exclusions laissés
--    par un ancien membre dans une organisation qu'il a quittée
DO $$
DECLARE
  r RECORD;
  t TEXT;
BEGIN
  IF to_regclass('public.entreprise') IS NULL OR to_regclass('public.organization_members') IS NULL THEN RETURN; END IF;
  FOR r IN
    SELECT DISTINCT e.organization_id AS org, e.user_id AS auteur FROM public.entreprise e
    WHERE e.organization_id IS NOT NULL AND e.user_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.organization_members m
                      WHERE m.organization_id = e.organization_id AND m.user_id = e.user_id AND m.role IN ('owner', 'admin'))
  LOOP
    PERFORM public.fiche_rendue_au_proprietaire(r.org, r.auteur);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['relance_executions', 'relance_exclusions'] LOOP
    CONTINUE WHEN to_regclass('public.' || t) IS NULL;
    FOR r IN EXECUTE format(
      'SELECT DISTINCT x.organization_id AS org, x.user_id AS auteur FROM public.%I x
        WHERE x.organization_id IS NOT NULL AND x.user_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM public.organization_members m
                          WHERE m.organization_id = x.organization_id AND m.user_id = x.user_id)', t)
    LOOP
      PERFORM public.fiche_rendue_au_proprietaire(r.org, r.auteur);
    END LOOP;
  END LOOP;
END $$;
