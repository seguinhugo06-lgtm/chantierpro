-- ============================================================
-- Migration 105: un membre qui quitte l'équipe ne garde rien de l'entreprise
-- ============================================================
-- Pourquoi : relecture gardien-securite du 24 oct. 2026 (MOYENNE, en production), constat au banc le même jour.
--   Retirer un membre (DELETE dans organization_members, 078) ne réattribue rien, et les policies « Users can … own »
--   ne contrôlent que user_id : un ancien administrateur qui a créé la fiche entreprise de l'organisation la modifie
--   encore (IBAN, nom, e-mail de réponse, mentions imprimées sur les devis et factures) et la lit ; il garde le
--   journal des relances et les exclusions écrits à son nom, que send-scheduled-relances lit au nom de l'auteur de
--   la fiche (effacer une ligne du journal : la relance déjà envoyée repartait au client). Réattribuer la seule fiche
--   ne suffisait pas (relectures architecte-donnees et gardien-securite du même jour) : les pages de paiement et de
--   signature cherchent la fiche par l'auteur de la pièce, et ses factures auraient montré sa fiche personnelle
--   (autre société, autre IBAN, qu'il modifie à sa guise) ; il modifiait encore ses brouillons et lisait ses clients
--   de l'organisation. La suppression de compte (072) réattribuait déjà tout cela au propriétaire ; le retrait, rien.
--
-- Effet :
--   1. quand un membre quitte l'équipe (retiré par le patron ou un administrateur, parti de lui-même, ou retiré par
--      le serveur), ce qu'il a créé dans cette organisation passe au propriétaire de l'organisation, comme à la
--      suppression de son compte (072) : fiche entreprise, devis et factures, clients, chantiers, paiements,
--      catalogue, etc. Ses factures continuent de montrer la fiche de l'entreprise, et d'être relancées. Restent à lui :
--      ses réglages et contenus personnels (abonnement, Stripe, banque, parrainage, réglages de trésorerie et
--      coefficients, notes vocales, accès à des services tiers), ses retours sur l'app, les journaux d'activité (ils
--      disent qui a fait quoi), et ce qui est dans une table où il ne peut avoir qu'une ligne (index unique) ;
--   2. du journal des relances et des exclusions, seules suivent les lignes qui portent sur ses pièces ; le reste reste
--      à son nom, que la relance automatique ne lit pas : sinon un ouvrier écrivait un faux « déjà relancé » sur une
--      facture du patron, ou excluait un client, et son départ donnait cela au patron ;
--   3. pas de rattrapage : en production, aucune ligne n'a pour auteur un non-membre de son organisation (relevé du
--      24 oct. 2026, hors journal des comptes supprimés), et un rattrapage aurait aussi donné au patron des lignes
--      glissées dans son organisation par un compte qui n'en a jamais été membre (avant 084). Le contrôle n° 3 ci-dessous
--      le vérifie ;
--   4. la fiche d'une organisation ne se lit plus qu'en membre et ne se modifie plus qu'en propriétaire ou
--      administrateur, même par son auteur (un administrateur rétrogradé ne change plus l'IBAN) ; une fiche sans
--      organisation reste à son auteur ;
--   5. depuis l'app, une fiche se crée au nom de son auteur et ne change plus ni d'organisation ni d'auteur (l'app
--      n'écrit ni l'une ni l'autre après la création) : un gérant ne la sort plus de l'organisation pour la garder, ni
--      ne la crée ou ne la met au nom d'un complice.
--   Rien ne change pour un artisan seul. Limites connues (suite `pieces-par-organisation`) : la relance automatique ne
--   suit que les pièces de l'auteur de la fiche ; si le patron en a déjà une, il en a deux, relancées chacune avec ses
--   propres réglages ; les factures en retard du partant deviennent celles du patron et, si l'envoi automatique est
--   activé, sont relancées au passage suivant ; l'exclusion d'un client posée par le partant ne le suit pas.
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   1) Déclencheurs — attendu 2 lignes :
--   SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgname IN ('trg_pieces_au_proprietaire_au_depart', 'trg_garder_fiche_entreprise') ORDER BY 1;
--   2) Policies « Users can … own entreprise » — attendu : view avec mon_role_organisation(organization_id) IS NOT NULL,
--      update avec mon_role_organisation(organization_id) = ANY (ARRAY['owner', 'admin']) dans qual ET with_check :
--   SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public' AND tablename = 'entreprise' AND policyname LIKE 'Users can %' ORDER BY 1;
--   3) Aucune ligne d'un non-membre dans une organisation, sur les tables qui suivent leur auteur — attendu : 'aucune' :
--   DO $c$ DECLARE t TEXT; n BIGINT; r TEXT := ''; BEGIN FOR t IN SELECT public.tables_rendues_au_depart() LOOP EXECUTE format('SELECT count(*) FROM public.%I x WHERE x.organization_id IS NOT NULL AND x.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id::text = x.organization_id::text AND m.user_id::text = x.user_id::text)', t) INTO n; IF n > 0 THEN r := r || t || '=' || n || ' '; END IF; END LOOP; RAISE NOTICE 'non-membres : %', coalesce(nullif(r, ''), 'aucune'); END $c$;
--   4) Les pièces suivent le partant — attendu 5 :
--   SELECT count(*) FROM public.tables_rendues_au_depart() t WHERE t IN ('clients', 'devis', 'entreprise', 'paiements', 'ramonages');
--   5) La réattribution n'est exécutable que par le serveur — attendu f, f :
--   SELECT has_function_privilege('anon', 'public.pieces_rendues_au_proprietaire(uuid, uuid)', 'execute') AS visiteur, has_function_privilege('authenticated', 'public.pieces_rendues_au_proprietaire(uuid, uuid)', 'execute') AS connecte;
-- ============================================================

-- Idempotente : CREATE OR REPLACE, DROP … IF EXISTS ; rejouable sans danger.

-- 1. Les tables dont les lignes suivent leur auteur quand il part : celles qui portent user_id et organization_id
--    (découvertes à l'exécution : le dépôt ne décrit pas exactement la production), sauf l'équipe et les invitations,
--    les réglages et contenus personnels (notes vocales comprises), les accès à des services tiers, les journaux
--    d'activité, le journal et les exclusions des relances (traités à part), et toute table dont un index unique
--    contient user_id : le patron y a souvent déjà sa ligne, et le retrait échouerait (un membre qui y écrirait une
--    ligne à l'organisation du patron se rendrait impossible à retirer — relecture gardien-securite du 24 oct.).
--    Même règle que l'étape 3 de supprimer_mon_compte (072), sans son filtre « log », qui écartait aussi `catalogue`.
CREATE OR REPLACE FUNCTION public.tables_rendues_au_depart()
RETURNS SETOF TEXT
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT c.table_name::text
  FROM information_schema.columns c
  JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
  WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE' AND c.column_name IN ('user_id', 'organization_id')
    AND c.table_name::text NOT IN (
      'organization_members', 'invitations', 'comptes_supprimes',
      'subscriptions', 'parrainages', 'stripe_config', 'gocardless_config', 'bank_connections', 'bank_transactions',
      'tresorerie_settings', 'catalogue_coefficients', 'retours', 'memos', 'usage_tracking', 'ai_memory',
      'integrations', 'webhooks', 'push_subscriptions',
      'relance_executions', 'relance_exclusions')
    AND c.table_name::text !~ '(_logs?$|^audit|^chat|notif|message|historique|lecture|read|integration|webhook)'
    AND NOT EXISTS (
      SELECT 1 FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey) AND a.attname = 'user_id'
      WHERE i.indisunique AND i.indrelid = format('public.%I', c.table_name)::regclass)
  GROUP BY 1
  HAVING count(*) = 2
  ORDER BY 1
$$;
REVOKE ALL ON FUNCTION public.tables_rendues_au_depart() FROM PUBLIC, anon, authenticated;

-- 2. Rendre au propriétaire de l'organisation ce qu'un auteur y a créé. Interne : appelée par le déclencheur et le
--    serveur, jamais par un client (identifiants libres). S'exécute avec les droits de son appelant
--    (le déclencheur, SECURITY DEFINER) : les gardes des pièces émises (093, 098, 102-104) laissent passer le serveur.
CREATE OR REPLACE FUNCTION public.pieces_rendues_au_proprietaire(p_org UUID, p_auteur UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_proprietaire UUID;
  v_table TEXT;
  v_ids UUID[];
  v_pieces UUID[] := '{}';
BEGIN
  SELECT o.owner_id INTO v_proprietaire FROM public.organizations o WHERE o.id = p_org;
  -- Organisation en cours de suppression (tout part avec elle), ou départ du propriétaire lui-même : rien à faire
  IF v_proprietaire IS NULL OR p_auteur IS NULL OR v_proprietaire = p_auteur THEN
    RETURN;
  END IF;

  -- a) Journal et exclusions des relances : seulement ce qui porte sur ses pièces (devis, factures, attestations),
  --    AVANT que ces pièces changent d'auteur. Ils les suivent : sans eux, une relance déjà envoyée repartirait. Le
  --    reste reste à son nom, que la relance ne lit pas : ce qu'il a écrit sur les pièces des autres (un faux « déjà
  --    relancé »), et ses exclusions de portée « client », qui couperaient les relances des factures du patron à ce
  --    client (relecture gardien-securite du 24 oct.).
  FOREACH v_table IN ARRAY ARRAY['devis', 'ramonages'] LOOP
    CONTINUE WHEN to_regclass('public.' || v_table) IS NULL;
    EXECUTE format('SELECT coalesce(array_agg(id), ''{}'') FROM public.%I WHERE organization_id = $1 AND user_id = $2', v_table)
      INTO v_ids USING p_org, p_auteur;
    v_pieces := v_pieces || v_ids;
  END LOOP;
  -- Une ligne sans organisation (relance manuelle) qui porte sur une de ses pièces de l'organisation la suit aussi
  IF to_regclass('public.relance_executions') IS NOT NULL THEN
    UPDATE public.relance_executions SET user_id = v_proprietaire
    WHERE user_id = p_auteur AND (organization_id = p_org OR organization_id IS NULL) AND document_id = ANY (v_pieces);
  END IF;
  IF to_regclass('public.relance_exclusions') IS NOT NULL THEN
    UPDATE public.relance_exclusions SET user_id = v_proprietaire
    WHERE user_id = p_auteur AND (organization_id = p_org OR organization_id IS NULL)
      AND scope = 'document' AND document_id = ANY (v_pieces);
  END IF;

  -- b) Tout le reste de ce qu'il a créé dans l'organisation, fiche entreprise comprise. Une erreur fait échouer le
  --    retrait (le patron le voit) plutôt que de laisser une table à l'ancien membre sans que personne le sache.
  FOR v_table IN SELECT public.tables_rendues_au_depart() LOOP
    EXECUTE format('UPDATE public.%I SET user_id = $1 WHERE organization_id::text = $2::text AND user_id::text = $3::text', v_table)
      USING v_proprietaire, p_org, p_auteur;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.pieces_rendues_au_proprietaire(UUID, UUID) FROM PUBLIC, anon, authenticated;

-- 3. Au départ d'un membre. SECURITY DEFINER : le patron qui retire un membre n'a pas accès à ce qui est écrit au nom de
--    ce membre (policies par compte), et les gardes des pièces émises ne visent que les comptes connectés.
--    Pas à la rétrogradation : le membre reste dans l'équipe et ses pièces gardent leur auteur ; la policy du 5 lui
--    retire la modification de la fiche.
CREATE OR REPLACE FUNCTION public.pieces_au_proprietaire_au_depart()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.pieces_rendues_au_proprietaire(OLD.organization_id, OLD.user_id);
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.pieces_au_proprietaire_au_depart() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF to_regclass('public.organization_members') IS NULL THEN RETURN; END IF;
  DROP TRIGGER IF EXISTS trg_pieces_au_proprietaire_au_depart ON public.organization_members;
  CREATE TRIGGER trg_pieces_au_proprietaire_au_depart
    AFTER DELETE ON public.organization_members
    FOR EACH ROW EXECUTE FUNCTION public.pieces_au_proprietaire_au_depart();
END $$;

-- 4. Depuis l'app (compte connecté, en direct), une fiche se crée au nom de son auteur, puis ne change ni d'organisation
--    ni d'auteur : sinon un gérant la sortait de l'organisation (sans organisation, ou dans la sienne) pour la garder
--    après son départ, ou la créait ou la mettait au nom d'un complice, avec son IBAN, que son départ ne réattribuait pas
--    (« Org members can insert / update entreprise » ne contrôlent pas user_id). Le serveur et les fonctions SECURITY
--    DEFINER (création du compte, suppression de compte, départ) ne sont pas concernés.
CREATE OR REPLACE FUNCTION public.garder_fiche_entreprise()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Une fiche entreprise se crée à votre nom' USING ERRCODE = '42501';
    END IF;
  ELSIF (OLD.organization_id IS NOT NULL AND NEW.organization_id IS DISTINCT FROM OLD.organization_id)
        OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Une fiche entreprise ne change ni d''organisation ni d''auteur' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.garder_fiche_entreprise() FROM PUBLIC, anon, authenticated;

-- 5. La fiche d'une organisation : lue par ses membres, modifiée par ses gérants, même par son auteur ; une fiche
--    sans organisation reste à son auteur. Les policies « Org … entreprise » (084) sont inchangées.
DO $$
BEGIN
  IF to_regclass('public.entreprise') IS NULL THEN RETURN; END IF;
  DROP TRIGGER IF EXISTS trg_garder_fiche_entreprise ON public.entreprise;
  CREATE TRIGGER trg_garder_fiche_entreprise
    BEFORE INSERT OR UPDATE OF organization_id, user_id ON public.entreprise
    FOR EACH ROW EXECUTE FUNCTION public.garder_fiche_entreprise();

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
