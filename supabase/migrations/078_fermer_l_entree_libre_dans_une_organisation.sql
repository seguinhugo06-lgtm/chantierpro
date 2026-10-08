-- ============================================================
-- Migration 078: fermer l'entrée libre dans une organisation
-- ============================================================
-- Pourquoi : relecture de sécurité du 8 oct. 2026 (tâche [org-invitations]). La production a
-- été constatée par Hugo le 8 oct. (pg_policies, pg_proc) : policies et fonctions identiques
-- aux migrations 035, 039 et 041 (effacées du dépôt par 227534e), et TOUTES les fonctions
-- ci-dessous exécutables par un visiteur sans compte (droits par défaut de Supabase).
--   • invitations : « Anyone can read pending invitations by token » laisse un visiteur (clé
--     publique) lister TOUTES les invitations en attente, avec leur jeton ; « Org admins can
--     manage invitations » laisse n'importe quel membre (un ouvrier) créer une invitation
--     « propriétaire » pour un second compte ;
--   • organization_members : « Admins can insert members » laisse un utilisateur connecté
--     s'inscrire lui-même dans n'importe quelle organisation, en propriétaire, puis lire et
--     modifier les clients, devis, réglages Stripe… de cette entreprise (policies « Org members
--     can … » de 038) ; « Admins can update/delete members » laisse tout membre se promouvoir
--     ou retirer le propriétaire ;
--   • accept_invitation(p_token, p_user_id) inscrit l'utilisateur qu'on lui passe ;
--     revoke_invitation annule n'importe quelle invitation, même appelée par un visiteur.
-- Prouvé au banc sur l'état de production (scripts/banc/socle.mjs) : un visiteur lit les
-- jetons et annule les invitations, un inconnu devient propriétaire et lit les clients, un
-- ouvrier se nomme propriétaire et retire le patron.
--
-- Effet :
--   • seuls le propriétaire et les administrateurs voient, créent et annulent les invitations
--     de leur organisation, changent un rôle ou retirent un membre ; personne ne nomme un
--     propriétaire ni ne touche à la ligne du propriétaire (comme l'écran Équipe le prévoit) ;
--   • on n'entre dans l'organisation d'un autre qu'en acceptant une invitation valable,
--     connecté, pour soi-même (auth.uid()) ; une invitation n'est valable que si son auteur
--     peut encore inviter et si elle ne donne pas le rôle de propriétaire ;
--   • le rôle « owner » est réservé à organizations.owner_id : un faux propriétaire inscrit par la
--     faille repasse en « readonly » (le patron peut alors le retirer), un patron rétrogradé ou
--     retiré retrouve son rôle ;
--   • la page /invitation/<jeton> marche toujours, sans compte (get_invitation_by_token reste
--     publique : le jeton est le secret) ; elle ne renvoie plus que ce qu'elle affiche ;
--   • les invitations en attente reçoivent un NOUVEAU jeton (les anciens étaient lisibles par
--     tous) : un lien déjà envoyé ne marche plus, l'artisan recopie le lien depuis Équipe ;
--     celles qu'un non-gérant avait créées, ou « propriétaire », sont annulées.
--   Rien ne change pour un artisan seul. L'app en ligne (qui passe encore p_user_id) et la
--   nouvelle (qui ne le passe plus) fonctionnent toutes deux avec cette migration.
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   1) Policies — attendu EXACTEMENT ces 7 lignes (aucune autre sur ces deux tables) :
--   SELECT tablename, policyname, cmd, roles::text FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('organization_members', 'invitations') ORDER BY 1, 2;
--      invitations          | Gérants : inviter                               | INSERT | {authenticated}
--      invitations          | Gérants : supprimer une invitation              | DELETE | {authenticated}
--      invitations          | Gérants : voir les invitations                  | SELECT | {authenticated}
--      organization_members | Gérants : changer un rôle                       | UPDATE | {authenticated}
--      organization_members | Gérants : retirer un membre                     | DELETE | {authenticated}
--      organization_members | Membres : voir l'équipe                         | SELECT | {authenticated}
--      organization_members | Propriétaire : s'inscrire dans son organisation | INSERT | {authenticated}
--   2) Fonctions — attendu : accept_invitation (p_token uuid, p_user_id uuid) visiteur f connecte t ;
--      get_invitation_by_token visiteur t connecte t ; mon_role_organisation et revoke_invitation
--      visiteur f connecte t ; invitation_utilisable visiteur f connecte f ; toutes avec search_path :
--   SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args, has_function_privilege('anon', p.oid, 'EXECUTE') AS visiteur, has_function_privilege('authenticated', p.oid, 'EXECUTE') AS connecte, array_to_string(p.proconfig, ',') AS reglages FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname IN ('accept_invitation', 'get_invitation_by_token', 'revoke_invitation', 'mon_role_organisation', 'invitation_utilisable') ORDER BY 1;
--   3) Membres qui ne sont pas propriétaires : chaque ligne doit être une personne invitée par le
--      patron ; une ligne inconnue (ou « readonly » que personne n'a choisi) : la retirer dans
--      Paramètres › Équipe, ou nous la signaler :
--   SELECT o.name AS organisation, u.email, m.role, m.joined_at FROM public.organization_members m JOIN public.organizations o ON o.id = m.organization_id JOIN auth.users u ON u.id = m.user_id WHERE m.user_id <> o.owner_id ORDER BY o.name, m.joined_at;
--   4) Droits par colonne — attendu : f, t, f, t :
--   SELECT has_column_privilege('authenticated', 'public.organization_members', 'joined_at', 'UPDATE') AS date_modifiable, has_column_privilege('authenticated', 'public.organization_members', 'role', 'UPDATE') AS role_modifiable, has_column_privilege('authenticated', 'public.invitations', 'token', 'INSERT') AS jeton_choisi, has_column_privilege('authenticated', 'public.invitations', 'email', 'INSERT') AS email_saisi;
--
-- ─── Avant d'appliquer (facultatif) : la faille a-t-elle déjà servi ? ─────────
--   Aucune ligne attendue. « FAUX PATRON » / « PATRON RÉTROGRADÉ » / « PATRON ABSENT » : la
--   migration le corrige, mais notez qui et où (et dites-le à Claude) avant d'appliquer.
--   SELECT o.name AS organisation, u.email, m.role, m.joined_at, CASE WHEN m.user_id = o.owner_id THEN 'PATRON RÉTROGRADÉ' ELSE 'FAUX PATRON' END AS constat FROM public.organization_members m JOIN public.organizations o ON o.id = m.organization_id JOIN auth.users u ON u.id = m.user_id WHERE (m.role = 'owner') <> (m.user_id = o.owner_id) UNION ALL SELECT o.name, u.email, NULL, NULL, 'PATRON ABSENT' FROM public.organizations o JOIN auth.users u ON u.id = o.owner_id WHERE NOT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = o.id AND m.user_id = o.owner_id);
-- ============================================================

-- Idempotente : rejouable sans danger (les policies de ces deux tables sont recréées à
-- l'identique ; un rejeu renouvelle seulement à nouveau le jeton des invitations en attente).

-- 1. Rôle de l'utilisateur CONNECTÉ dans une organisation (NULL s'il n'en est pas membre).
--    SECURITY DEFINER : les policies de organization_members la lisent sans se réévaluer
--    elles-mêmes (récursion). Aucun paramètre d'utilisateur : on ne lit que son propre rôle.
CREATE OR REPLACE FUNCTION public.mon_role_organisation(p_org UUID)
RETURNS public.org_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT m.role FROM public.organization_members m
  WHERE m.organization_id = p_org AND m.user_id = auth.uid()
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.mon_role_organisation(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mon_role_organisation(UUID) TO authenticated;

-- 2. Une invitation est utilisable si elle ne donne pas le rôle de propriétaire et si son
--    auteur peut encore inviter (propriétaire ou administrateur de l'organisation). Écarte les
--    invitations créées par un simple membre avant cette migration. Interne : appelée par les
--    fonctions ci-dessous seulement.
CREATE OR REPLACE FUNCTION public.invitation_utilisable(p_org UUID, p_auteur UUID, p_role public.org_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p_role IS DISTINCT FROM 'owner'::public.org_role AND (
    EXISTS (SELECT 1 FROM public.organization_members m
            WHERE m.organization_id = p_org AND m.user_id = p_auteur AND m.role IN ('owner', 'admin'))
    OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = p_org AND o.owner_id = p_auteur))
$$;
REVOKE ALL ON FUNCTION public.invitation_utilisable(UUID, UUID, public.org_role) FROM PUBLIC, anon, authenticated;

-- 3. Retirer TOUTES les policies existantes des deux tables, quels que soient leurs noms : une
--    seule policy permissive oubliée suffirait à rouvrir l'accès (les policies s'additionnent).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('organization_members', 'invitations')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- 4. organization_members
CREATE POLICY "Membres : voir l'équipe" ON public.organization_members
  FOR SELECT TO authenticated
  USING (public.mon_role_organisation(organization_id) IS NOT NULL);

-- Création d'une organisation par le client : s'inscrire propriétaire de SA propre organisation
-- (create_default_org, utilisée par l'app, passe outre la RLS et n'en dépend pas).
CREATE POLICY "Propriétaire : s'inscrire dans son organisation" ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'owner'
    AND EXISTS (SELECT 1 FROM public.organizations o
                WHERE o.id = organization_members.organization_id AND o.owner_id = auth.uid())
  );

CREATE POLICY "Gérants : changer un rôle" ON public.organization_members
  FOR UPDATE TO authenticated
  USING (public.mon_role_organisation(organization_id) IN ('owner', 'admin') AND role <> 'owner')
  WITH CHECK (public.mon_role_organisation(organization_id) IN ('owner', 'admin') AND role <> 'owner');

CREATE POLICY "Gérants : retirer un membre" ON public.organization_members
  FOR DELETE TO authenticated
  USING (public.mon_role_organisation(organization_id) IN ('owner', 'admin') AND role <> 'owner');

-- Une ligne de membre ne change ni d'organisation ni d'utilisateur : sinon un gérant pourrait
-- « déplacer » un membre vers une autre organisation ou y substituer n'importe quel compte.
CREATE OR REPLACE FUNCTION public.membre_identite_immuable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Un membre ne change ni d''organisation ni de compte : retirez-le puis invitez la bonne personne'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_membre_identite_immuable ON public.organization_members;
CREATE TRIGGER trg_membre_identite_immuable
  BEFORE UPDATE OF organization_id, user_id ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.membre_identite_immuable();

-- 4 bis. Le rôle « owner » appartient au propriétaire de l'organisation (organizations.owner_id), à
--    personne d'autre. L'app ne crée jamais d'autre « owner » : une telle ligne vient de la faille
--    (intrus inscrit propriétaire, ouvrier qui s'est promu). Sans ce réalignement, elle survivrait à
--    078 et deviendrait même impossible à retirer (les policies protègent la ligne « owner »), et un
--    patron rétrogradé ou retiré ne gérerait plus son équipe. Les faux propriétaires passent en
--    « readonly » (pas supprimés : le patron les retire dans Équipe, ou les reconnaît).
UPDATE public.organization_members m SET role = 'readonly'
FROM public.organizations o
WHERE o.id = m.organization_id AND m.role = 'owner' AND m.user_id <> o.owner_id;
UPDATE public.organization_members m SET role = 'owner'
FROM public.organizations o
WHERE o.id = m.organization_id AND m.user_id = o.owner_id AND m.role <> 'owner';
INSERT INTO public.organization_members (organization_id, user_id, role, joined_at)
SELECT o.id, o.owner_id, 'owner', coalesce(o.created_at, now())
FROM public.organizations o
WHERE NOT EXISTS (SELECT 1 FROM public.organization_members m
                  WHERE m.organization_id = o.id AND m.user_id = o.owner_id);

CREATE OR REPLACE FUNCTION public.membre_proprietaire_coherent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (NEW.role = 'owner') IS DISTINCT FROM EXISTS (
       SELECT 1 FROM public.organizations o WHERE o.id = NEW.organization_id AND o.owner_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Le rôle propriétaire est réservé au propriétaire de l''organisation' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_membre_proprietaire_coherent ON public.organization_members;
CREATE TRIGGER trg_membre_proprietaire_coherent
  BEFORE INSERT OR UPDATE OF role, user_id, organization_id ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.membre_proprietaire_coherent();

-- 4 ter. Colonnes : un gérant ne change que le RÔLE d'un membre (pas joined_at, qui décide de
--    l'organisation ouverte par l'app, ni invited_by) ; une invitation ne fixe ni son jeton, ni son
--    statut, ni ses dates de création ou d'acceptation (l'app n'envoie que les colonnes accordées).
--    Un visiteur n'écrit rien. La lecture reste accordée : des policies d'autres tables lisent
--    organization_members.
REVOKE UPDATE ON public.organization_members FROM authenticated;
GRANT UPDATE (role) ON public.organization_members TO authenticated;
REVOKE INSERT ON public.invitations FROM authenticated;
GRANT INSERT (organization_id, email, phone, role, invited_by, expires_at) ON public.invitations TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.organization_members, public.invitations FROM anon;

-- 5. invitations : réservées au propriétaire et aux administrateurs de l'organisation.
--    Pas de policy UPDATE : l'annulation passe par revoke_invitation, l'acceptation par
--    accept_invitation. Plus aucune lecture par un visiteur.
CREATE POLICY "Gérants : voir les invitations" ON public.invitations
  FOR SELECT TO authenticated
  USING (public.mon_role_organisation(organization_id) IN ('owner', 'admin'));

CREATE POLICY "Gérants : inviter" ON public.invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.mon_role_organisation(organization_id) IN ('owner', 'admin')
    AND invited_by = auth.uid()
    AND role <> 'owner'
    AND status = 'pending'
    AND accepted_at IS NULL
    AND expires_at <= now() + interval '30 days'
  );

CREATE POLICY "Gérants : supprimer une invitation" ON public.invitations
  FOR DELETE TO authenticated
  USING (public.mon_role_organisation(organization_id) IN ('owner', 'admin'));

-- 6. Page publique /invitation/<jeton> : sans compte, avec le seul jeton. Ne renvoie que ce que
--    la page affiche (plus l'adresse ni le téléphone de l'invité, ni les identifiants internes).
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inv public.invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_inv FROM public.invitations
  WHERE token = p_token AND status = 'pending' AND expires_at > now();
  IF NOT FOUND OR NOT public.invitation_utilisable(v_inv.organization_id, v_inv.invited_by, v_inv.role) THEN
    RETURN json_build_object('error', 'Invitation introuvable ou expirée');
  END IF;
  RETURN json_build_object(
    'organization_name', (SELECT o.name FROM public.organizations o WHERE o.id = v_inv.organization_id),
    'role', v_inv.role,
    'invited_by_email', (SELECT u.email FROM auth.users u WHERE u.id = v_inv.invited_by),
    'expires_at', v_inv.expires_at
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_invitation_by_token(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(UUID) TO anon, authenticated;

-- 7. Accepter une invitation : pour l'utilisateur connecté, jamais pour un autre.
--    p_user_id reste accepté (DEFAULT NULL) pour l'app encore en cache qui le passe : il doit
--    alors désigner le compte connecté. DROP d'abord : on ajoute une valeur par défaut.
DROP FUNCTION IF EXISTS public.accept_invitation(UUID, UUID);
CREATE FUNCTION public.accept_invitation(p_token UUID, p_user_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_inv public.invitations%ROWTYPE;
  v_nb INT;
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

  SELECT count(*) INTO v_nb FROM public.organization_members WHERE organization_id = v_inv.organization_id;
  IF v_nb >= 50 THEN
    RETURN json_build_object('error', 'Limite de membres atteinte');
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

-- 8. Annuler une invitation : réservé au propriétaire et aux administrateurs de son organisation.
CREATE OR REPLACE FUNCTION public.revoke_invitation(p_invitation_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.invitations i SET status = 'revoked'
  WHERE i.id = p_invitation_id
    AND i.status = 'pending'
    AND public.mon_role_organisation(i.organization_id) IN ('owner', 'admin');
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invitation introuvable');
  END IF;
  RETURN json_build_object('success', true);
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_invitation(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_invitation(UUID) TO authenticated;

-- 9. Invitations en attente : celles qui ne sont plus utilisables sont annulées ; les autres
--    reçoivent un nouveau jeton (les anciens étaient lisibles par n'importe quel visiteur).
UPDATE public.invitations i SET status = 'revoked'
WHERE i.status = 'pending' AND NOT public.invitation_utilisable(i.organization_id, i.invited_by, i.role);
UPDATE public.invitations SET token = gen_random_uuid()
WHERE status = 'pending' AND expires_at > now();

NOTIFY pgrst, 'reload schema';
