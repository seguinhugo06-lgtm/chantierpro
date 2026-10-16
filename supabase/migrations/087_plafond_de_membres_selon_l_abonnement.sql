-- ============================================================
-- Migration 087: plafond de membres selon l'abonnement
-- ============================================================
-- Pourquoi : le nombre de membres d'une équipe n'était limité que par l'écran Équipe
-- (TeamManagement.jsx : membres hors propriétaire + invitations en attente < limite du plan).
-- La base, elle, plafonnait à 50 (accept_invitation, 078) et la policy « Gérants : inviter »
-- ne comptait rien : un compte gratuit pouvait inviter 49 personnes par l'API avec la clé
-- publique (tâche equipe-plafond de docs/feuille-de-route.md).
-- Effet : la base applique la même règle que l'écran, d'après l'abonnement du PROPRIÉTAIRE de
-- l'organisation (abonnement actif, en essai ou en échec de paiement, comme STATUTS_ACTIFS de
-- src/services/subscriptionsApi.js ; puis get_plan_limit(plan, 'equipe') de 059 : 1 en gratuit
-- et artisan, 10 en équipe, sans compter le propriétaire) :
--   • inviter est refusé quand membres + invitations en attente atteignent la limite ;
--   • accepter est refusé quand les membres atteignent la limite (abonnement réduit depuis
--     l'invitation), avec un message que l'invité comprend.
-- Les membres déjà présents restent (relevé du 16 oct. 2026 : au plus 2 membres par
-- organisation, propriétaire compris).
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   1) SELECT p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') AS visiteur,
--        has_function_privilege('authenticated', p.oid, 'EXECUTE') AS connecte
--      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--      WHERE n.nspname = 'public' AND p.proname IN ('equipe_complete', 'equipe_peut_inviter', 'accept_invitation')
--      ORDER BY 1;
--      attendu : accept_invitation f t ; equipe_complete f f ; equipe_peut_inviter f t
--   2) SELECT pg_get_expr(polwithcheck, polrelid) LIKE '%equipe_peut_inviter%' AS plafonnee
--      FROM pg_policy WHERE polname = 'Gérants : inviter';      attendu : t
--   3) SELECT get_plan_limit('gratuit','equipe'), get_plan_limit('artisan','equipe'), get_plan_limit('equipe','equipe');
--      attendu : 1 | 1 | 10 (définition de production hors dépôt : un -1 rendrait le plafond muet)
--   4) SELECT count(*) FROM public.organizations o WHERE public.equipe_complete(o.id, false)
--        AND (SELECT count(*) FROM public.organization_members m WHERE m.organization_id = o.id AND m.role <> 'owner')
--            > public.get_plan_limit(public.get_user_plan(o.owner_id), 'equipe');
--      attendu : 0 (aucune équipe déjà au-delà de sa limite)
-- ============================================================

-- 1. L'équipe a-t-elle atteint la limite de l'abonnement de son propriétaire ? Interne : appelée
--    par accept_invitation et equipe_peut_inviter seulement. NULL si l'organisation n'existe pas.
CREATE OR REPLACE FUNCTION public.equipe_complete(p_org UUID, p_avec_invitations BOOLEAN)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN v.limite < 0 THEN false  -- -1 : illimité
    ELSE v.membres + CASE WHEN p_avec_invitations THEN v.invitations ELSE 0 END >= v.limite
  END
  FROM (
    SELECT public.get_plan_limit(coalesce(
        (SELECT s.plan FROM public.subscriptions s
         WHERE s.user_id = o.owner_id AND s.status IN ('active', 'trialing', 'past_due')
         ORDER BY s.created_at DESC LIMIT 1), 'gratuit'), 'equipe') AS limite,
      (SELECT count(*) FROM public.organization_members m
       WHERE m.organization_id = o.id AND m.role <> 'owner') AS membres,
      (SELECT count(*) FROM public.invitations i
       WHERE i.organization_id = o.id AND i.status = 'pending' AND i.expires_at > now()) AS invitations
    FROM public.organizations o
    WHERE o.id = p_org
  ) v
$$;
REVOKE ALL ON FUNCTION public.equipe_complete(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;

-- 2. Pour la policy d'invitation : le gérant connecté peut-il encore inviter dans cette
--    organisation ? Ne répond rien d'utile à un non-gérant (false). VOLATILE et non STABLE : une
--    fonction STABLE lit l'état d'avant la requête, et un INSERT de plusieurs lignes (tableau
--    envoyé à PostgREST) passerait en entier ; VOLATILE voit les lignes déjà insérées par la même
--    requête et la refuse en bloc (relecture gardien-securite du 16 oct. 2026).
CREATE OR REPLACE FUNCTION public.equipe_peut_inviter(p_org UUID)
RETURNS BOOLEAN
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(public.mon_role_organisation(p_org) IN ('owner', 'admin'), false)
    AND NOT coalesce(public.equipe_complete(p_org, true), true)
$$;
REVOKE ALL ON FUNCTION public.equipe_peut_inviter(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.equipe_peut_inviter(UUID) TO authenticated;

-- 3. Inviter : mêmes conditions que 078, plus la place dans l'équipe.
DROP POLICY IF EXISTS "Gérants : inviter" ON public.invitations;
CREATE POLICY "Gérants : inviter" ON public.invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.mon_role_organisation(organization_id) IN ('owner', 'admin')
    AND invited_by = auth.uid()
    AND role <> 'owner'
    AND status = 'pending'
    AND accepted_at IS NULL
    AND expires_at <= now() + interval '30 days'
    AND public.equipe_peut_inviter(organization_id)
  );

-- 4. Accepter : la limite de l'abonnement remplace le plafond fixe de 50. Le reste est celui de
--    078. Verrou sur l'organisation : deux acceptations simultanées ne dépassent pas la limite.
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token UUID, p_user_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_inv public.invitations%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('error', 'Connectez-vous pour accepter l''invitation');
  END IF;
  IF p_user_id IS NOT NULL AND p_user_id <> v_uid THEN
    RETURN json_build_object('error', 'Cette invitation ne peut être acceptée que pour le compte connecté');
  END IF;

  -- Verrou : deux acceptations simultanées du même jeton n'en font qu'une.
  SELECT * INTO v_inv FROM public.invitations
  WHERE token = p_token AND status = 'pending' AND expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invitation introuvable ou expirée');
  END IF;

  IF NOT public.invitation_utilisable(v_inv.organization_id, v_inv.invited_by, v_inv.role) THEN
    UPDATE public.invitations SET status = 'revoked' WHERE id = v_inv.id;
    RETURN json_build_object('error', 'Invitation introuvable ou expirée');
  END IF;

  IF EXISTS (SELECT 1 FROM public.organization_members
             WHERE organization_id = v_inv.organization_id AND user_id = v_uid) THEN
    UPDATE public.invitations SET status = 'accepted', accepted_at = now() WHERE id = v_inv.id;
    RETURN json_build_object('success', true, 'already_member', true);
  END IF;

  PERFORM 1 FROM public.organizations WHERE id = v_inv.organization_id FOR NO KEY UPDATE;
  IF coalesce(public.equipe_complete(v_inv.organization_id, false), true) THEN
    RETURN json_build_object('error', 'Cette équipe est complète pour l''abonnement de l''entreprise. Demandez à la personne qui vous a invité de libérer une place ou de passer à l''offre Équipe.');
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role, invited_by)
  VALUES (v_inv.organization_id, v_uid, v_inv.role, v_inv.invited_by);
  UPDATE public.invitations SET status = 'accepted', accepted_at = now() WHERE id = v_inv.id;

  -- Journal facultatif : son schéma varie selon les migrations appliquées (016 / 035) ; une
  -- colonne absente ne doit pas empêcher l'invité d'entrer.
  BEGIN
    INSERT INTO public.activity_log (organization_id, user_id, action, entity_type, metadata)
    VALUES (v_inv.organization_id, v_uid, 'member_joined', 'organization_member',
            jsonb_build_object('role', v_inv.role, 'invitation_id', v_inv.id));
  EXCEPTION WHEN undefined_table OR undefined_column OR not_null_violation THEN
    NULL;
  END;

  RETURN json_build_object('success', true, 'organization_id', v_inv.organization_id, 'role', v_inv.role);
END;
$$;
REVOKE ALL ON FUNCTION public.accept_invitation(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_invitation(UUID, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
