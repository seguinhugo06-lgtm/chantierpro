-- ============================================================
-- Migration 072: Suppression de compte réelle
-- ============================================================
-- Pourquoi : « Supprimer mon compte » appelait delete_user_data(), une fonction effacée du dépôt
-- (commit 227534e) dont la version d'origine visait une table `articles` qui n'existe pas ; le
-- repli côté client ignorait toutes les erreurs. Résultat : rien n'était supprimé et le compte
-- d'authentification survivait — alors que l'écran annonçait « supprimé définitivement ».
-- Exigé par le RGPD (art. 17) et par l'App Store (règle 5.1.1(v)).
--
-- supprimer_mon_compte(p_simulation, p_fichiers_restants), appelée par l'utilisateur connecté :
--   1. refuse si un abonnement payant est encore actif (sinon Stripe continuerait de prélever) ;
--   2. refuse si l'utilisateur possède une organisation qui compte d'autres membres ;
--   3. dans l'organisation d'un AUTRE dont il est membre, réattribue au propriétaire les données
--      métier que l'utilisateur y a créées (un salarié qui part n'emporte pas les devis de
--      l'entreprise) ; jamais ses réglages de paiement ni de banque, toujours supprimés ;
--   4. supprime ses lignes dans toutes les tables de `public` qui ont user_id / organization_id,
--      en plusieurs passes pour respecter l'ordre des clés étrangères (tables découvertes à
--      l'exécution : le dépôt ne décrit pas exactement la production) ;
--   5. supprime ses organisations ;
--   6. neutralise les références restantes à son compte qui bloqueraient la suppression
--      (colonnes invited_by, journaux…) : mises à NULL, ou lignes supprimées si NOT NULL ;
--   7. journalise la suppression (identifiant seulement, ni e-mail ni nom) ;
--   8. supprime le compte auth.users.
-- En simulation, tout est exécuté puis annulé, et le bilan est renvoyé.
-- Toute erreur inattendue fait échouer l'ensemble (rien n'est supprimé à moitié) et remonte à l'app.
--
-- Les fichiers Storage sont supprimés par l'app AVANT l'appel (Supabase interdit la suppression
-- SQL directe dans storage.objects) ; ceux qui n'ont pas pu l'être sont passés en paramètre et
-- journalisés, pour une purge manuelle depuis le tableau de bord.
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   SELECT proname, prosecdef FROM pg_proc WHERE proname = 'supprimer_mon_compte';  -- 1 ligne, t
--   SELECT count(*) FROM public.comptes_supprimes;                                   -- 0
--
-- ─── Simulation sur un compte précis, sans rien supprimer (éditeur SQL) ─────
--   BEGIN;
--   SELECT set_config('request.jwt.claims', json_build_object('sub', '<UUID DU COMPTE>')::text, true);
--   SELECT public.supprimer_mon_compte(true);   -- bilan JSON ; une erreur ici = un blocage à corriger
--   ROLLBACK;
-- ============================================================

-- 1. Journal des suppressions (aucune policy : lisible seulement depuis le tableau de bord)
CREATE TABLE IF NOT EXISTS public.comptes_supprimes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,              -- volontairement sans clé étrangère : le compte n'existe plus
  organization_id UUID,               -- organisation principale supprimée avec le compte, s'il y en avait une
  supprime_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  lignes_supprimees BIGINT NOT NULL DEFAULT 0,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  fichiers_restants JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.comptes_supprimes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_comptes_supprimes_user_id ON public.comptes_supprimes(user_id);

-- 2. La fonction
CREATE OR REPLACE FUNCTION public.supprimer_mon_compte(
  p_simulation BOOLEAN DEFAULT FALSE,
  p_fichiers_restants JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_orgs TEXT[] := '{}';              -- organisations possédées (en texte : types de colonnes hétérogènes)
  v_tables TEXT[];
  v_restantes TEXT[];
  v_echecs TEXT[];
  v_table TEXT;
  v_a_user BOOLEAN;
  v_a_org BOOLEAN;
  v_cond TEXT;
  v_n BIGINT;
  v_total BIGINT := 0;
  v_detail JSONB := '{}'::jsonb;
  v_reattribuees JSONB := '{}'::jsonb;
  v_neutralisees JSONB := '{}'::jsonb;
  v_ref RECORD;
  -- Paiement et banque : jamais réattribués au patron (sa clé Stripe ou son compte bancaire
  -- deviendraient ceux du partant) ; toujours supprimés avec le compte.
  v_sensibles TEXT[] := ARRAY['stripe_config', 'gocardless_config', 'bank_connections', 'bank_transactions'];
  v_membre TEXT;
  v_tour INT;
  v_passe INT;
  v_bilan JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NON_CONNECTE';
  END IF;

  -- 1. Organisations possédées : refus s'il y a d'autres membres
  IF to_regclass('public.organizations') IS NOT NULL THEN
    SELECT coalesce(array_agg(id::text), '{}') INTO v_orgs FROM public.organizations WHERE owner_id = v_uid;
    IF to_regclass('public.organization_members') IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id::text = ANY (v_orgs) AND m.user_id <> v_uid
    ) THEN
      RAISE EXCEPTION 'EQUIPE_ACTIVE';
    END IF;
  END IF;

  -- 2. Abonnement payant encore actif (lu via to_jsonb : colonnes pas forcément toutes présentes)
  IF to_regclass('public.subscriptions') IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE (to_jsonb(s)->>'user_id' = v_uid::text OR to_jsonb(s)->>'organization_id' = ANY (v_orgs))
      AND nullif(to_jsonb(s)->>'stripe_subscription_id', '') IS NOT NULL
      AND to_jsonb(s)->>'status' IN ('active', 'trialing', 'past_due')
      AND coalesce((to_jsonb(s)->>'cancel_at_period_end')::boolean, false) = false
      AND coalesce(to_jsonb(s)->>'plan', 'gratuit') NOT IN ('gratuit', 'free', 'decouverte')
  ) THEN
    RAISE EXCEPTION 'ABONNEMENT_ACTIF';
  END IF;

  SELECT coalesce(array_agg(DISTINCT c.table_name::text), '{}') INTO v_tables
  FROM information_schema.columns c
  JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
  WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    AND c.column_name IN ('user_id', 'organization_id')
    AND c.table_name NOT IN ('organizations', 'comptes_supprimes');

  BEGIN  -- bloc annulable : en simulation, une exception finale défait tout ce qui suit
    -- 3. Données créées dans l'organisation d'un autre → au propriétaire de cette organisation
    --    Seulement dans une organisation dont il est MEMBRE : n'importe quel compte peut écrire
    --    l'organization_id d'un autre sur ses propres lignes (revue de sécurité du 8 oct., tâche
    --    [org-invitations]) ; sans cette condition, supprimer son compte offrait ces lignes — une
    --    clé Stripe par exemple — au patron d'une entreprise inconnue.
    v_membre := CASE WHEN to_regclass('public.organization_members') IS NOT NULL
      THEN 'EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id::text = o.id::text AND m.user_id::text = $1)'
      ELSE 'false' END;
    IF to_regclass('public.organizations') IS NOT NULL THEN
      FOREACH v_table IN ARRAY v_tables LOOP
        CONTINUE WHEN v_table IN ('organization_members', 'invitations', 'subscriptions') OR v_table = ANY (v_sensibles)
          OR v_table ~ '(log|chat|message|notif|audit|historique|lecture|read)';
        SELECT bool_or(column_name = 'user_id'), bool_or(column_name = 'organization_id')
          INTO v_a_user, v_a_org
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = v_table AND column_name IN ('user_id', 'organization_id');
        CONTINUE WHEN NOT (v_a_user AND v_a_org);
        EXECUTE format(
          'UPDATE public.%I x SET user_id = o.owner_id FROM public.organizations o
            WHERE x.organization_id::text = o.id::text AND x.user_id::text = $1 AND o.owner_id <> $2 AND %s',
          v_table, v_membre) USING v_uid::text, v_uid;
        GET DIAGNOSTICS v_n = ROW_COUNT;
        IF v_n > 0 THEN v_reattribuees := v_reattribuees || jsonb_build_object(v_table, v_n); END IF;
      END LOOP;
    END IF;

    -- 4 et 5. Suppression en passes (ordre des clés étrangères), organisations, puis une passe
    -- de plus pour les lignes qu'auraient créées des déclencheurs pendant la suppression.
    FOR v_tour IN 1..2 LOOP
      v_restantes := v_tables;
      FOR v_passe IN 1..8 LOOP
        EXIT WHEN cardinality(v_restantes) = 0;
        v_echecs := '{}';
        FOREACH v_table IN ARRAY v_restantes LOOP
          SELECT bool_or(column_name = 'user_id'), bool_or(column_name = 'organization_id')
            INTO v_a_user, v_a_org
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = v_table AND column_name IN ('user_id', 'organization_id');
          v_cond := CASE
            WHEN v_a_user AND v_a_org AND (v_table IN ('organization_members', 'invitations', 'subscriptions') OR v_table = ANY (v_sensibles))
              THEN 'user_id::text = $1 OR organization_id::text = ANY ($2)'
            WHEN v_a_user AND v_a_org
              THEN 'organization_id::text = ANY ($2) OR (user_id::text = $1 AND (organization_id IS NULL OR organization_id::text = ANY ($2)))'
            WHEN v_a_user THEN 'user_id::text = $1'
            ELSE 'organization_id::text = ANY ($2)'
          END;
          BEGIN
            EXECUTE format('DELETE FROM public.%I WHERE %s', v_table, v_cond) USING v_uid::text, v_orgs;
            GET DIAGNOSTICS v_n = ROW_COUNT;
            IF v_n > 0 THEN
              v_total := v_total + v_n;
              v_detail := jsonb_set(v_detail, ARRAY[v_table], to_jsonb(coalesce((v_detail->>v_table)::bigint, 0) + v_n));
            END IF;
          EXCEPTION WHEN foreign_key_violation THEN
            v_echecs := v_echecs || v_table;   -- une table enfant reste à vider : nouvel essai à la passe suivante
          END;
        END LOOP;
        v_restantes := v_echecs;
      END LOOP;
      IF cardinality(v_restantes) > 0 THEN
        RAISE EXCEPTION 'SUPPRESSION_INCOMPLETE: %', array_to_string(v_restantes, ', ');
      END IF;

      IF v_tour = 1 AND to_regclass('public.organizations') IS NOT NULL THEN
        DELETE FROM public.organizations WHERE id::text = ANY (v_orgs);
      END IF;
    END LOOP;

    -- 6. Références restantes au compte qui bloqueraient sa suppression (clés NO ACTION / RESTRICT)
    FOR v_ref IN
      SELECT cl.relname::text AS tbl, a.attname::text AS col, a.attnotnull AS obligatoire
      FROM pg_constraint co
      JOIN pg_class cl ON cl.oid = co.conrelid
      JOIN pg_namespace ns ON ns.oid = cl.relnamespace
      JOIN pg_attribute a ON a.attrelid = co.conrelid AND a.attnum = co.conkey[1]
      WHERE co.contype = 'f' AND co.confrelid = 'auth.users'::regclass AND ns.nspname = 'public'
        AND array_length(co.conkey, 1) = 1 AND co.confdeltype IN ('a', 'r')
    LOOP
      IF v_ref.obligatoire THEN
        EXECUTE format('DELETE FROM public.%I WHERE %I = $1', v_ref.tbl, v_ref.col) USING v_uid;
      ELSE
        EXECUTE format('UPDATE public.%I SET %I = NULL WHERE %I = $1', v_ref.tbl, v_ref.col, v_ref.col) USING v_uid;
      END IF;
      GET DIAGNOSTICS v_n = ROW_COUNT;
      IF v_n > 0 THEN v_neutralisees := v_neutralisees || jsonb_build_object(v_ref.tbl || '.' || v_ref.col, v_n); END IF;
    END LOOP;

    v_bilan := jsonb_build_object(
      'simulation', p_simulation,
      'lignes_supprimees', v_total,
      'tables', v_detail,
      'reattribuees', v_reattribuees,
      'references_neutralisees', v_neutralisees,
      'organisations_supprimees', cardinality(v_orgs),
      'fichiers_restants', coalesce(jsonb_array_length(p_fichiers_restants), 0)
    );

    -- 7. Journal
    INSERT INTO public.comptes_supprimes (user_id, organization_id, lignes_supprimees, detail, fichiers_restants)
    VALUES (v_uid, (v_orgs[1])::uuid, v_total, v_bilan, coalesce(p_fichiers_restants, '[]'::jsonb));

    -- 8. Le compte lui-même (identités, sessions et lignes en cascade)
    DELETE FROM auth.users WHERE id = v_uid;

    IF p_simulation THEN
      RAISE EXCEPTION 'SIMULATION_ANNULEE';
    END IF;
  EXCEPTION WHEN raise_exception THEN
    -- Seule l'annulation volontaire de la simulation est absorbée ; tout le reste remonte.
    IF SQLERRM <> 'SIMULATION_ANNULEE' THEN RAISE; END IF;
  END;

  RETURN v_bilan;
END;
$$;

REVOKE ALL ON FUNCTION public.supprimer_mon_compte(BOOLEAN, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.supprimer_mon_compte(BOOLEAN, JSONB) TO authenticated;

-- 3. L'ancienne fonction (si elle existe encore en production) ne doit plus servir
DROP FUNCTION IF EXISTS public.delete_user_data();
