-- ============================================================
-- Migration 107: quota mensuel et journal des coûts de l'IA, par organisation et par fonction
-- ============================================================
-- Pourquoi : la dictée (fonction Edge voice-intent) appelle l'API d'Anthropic, qui coûte à chaque appel. Le seul
-- quota était un compteur dans le navigateur (src/lib/dicteeQuota.js) : il repart à zéro en changeant d'appareil ou
-- en vidant le stockage, et un appel direct à la fonction l'ignore. Décision D-07 : l'IA reste masquée tant qu'il
-- n'y a pas de quota côté serveur. Hugo ne voyait pas non plus ce que l'IA coûte.
-- Effet : chaque appel est RÉSERVÉ avant l'appel à l'API (refusé au-delà du quota du plan pour le mois en cours,
-- heure de Paris), puis CLOS avec le modèle, les jetons consommés, la durée et l'issue. Décomptent : les appels
-- réservés, réussis, et les échecs provoqués par la dictée (refus du modèle, réponse illisible) ; une panne de notre
-- côté (API en panne, crédits épuisés, clé refusée, délai, réseau) ne coûte pas de dictée à l'artisan. Rien ne change à
-- l'écran tant que FONCTIONS.ia est éteint.
--
-- Conception :
-- - Générique : une ligne par appel, avec la fonction (`dictee`, plus tard `assistant`…). Le quota se compte par
--   organisation, par mois et par fonction ; le journal sert aussi au suivi des coûts.
-- - Le quota par plan vient de PLANS[plan].limits (src/stores/subscriptionStore.js) : la fonction Edge le passe
--   (`p_limites`, ex. {"gratuit":10,"artisan":-1,"equipe":-1}, -1 = illimité), recopié dans
--   supabase/functions/voice-intent/regles.ts et comparé à PLANS par un test. Un plan absent de p_limites vaut 0.
-- - Le plan est lu en base, comme l'app le choisit (fetchSubscription → choisirAbonnement + appliquerFinOffre) :
--   parmi la ligne de l'utilisateur, celle de l'organisation et celle de son propriétaire, le plan le plus haut des
--   lignes actives ; une ligne inactive (résiliée, impayée) ou une offre testeur échue (sans Stripe) vaut « gratuit »
--   (plus strict que l'app, qui garde le plan d'une ligne inactive faute de mieux : relecture B3).
-- - Fermé à l'API publique (comme 077) : RLS sans policy, droits retirés à anon et authenticated. Les deux fonctions
--   sont SECURITY DEFINER et n'appellent pas auth.uid() : elles ne sont exécutables que par service_role (la fonction
--   Edge, après avoir vérifié le jeton de l'utilisateur). Un utilisateur qui pourrait réserver épuiserait le quota
--   d'une autre entreprise ; qui pourrait clore « en échec » remettrait son compteur à zéro.
-- - L'utilisateur doit être membre de l'organisation demandée (sinon HORS_ORGANISATION) ; sans organisation
--   demandée, sa première organisation.
-- - Au plan gratuit, le quota se compte aussi PAR COMPTE (relecture gardien-securite du 3 nov., H1) : un compte peut
--   créer des organisations à lui ; sans cela, chaque nouvelle organisation rouvrait 10 dictées.
-- - Plafond anti-abus quel que soit le plan (H2) : 5 analyses par minute et 100 par jour et par compte. Au-delà, refus
--   avec motif « plafond ». Le plafond du jour est un choix à confirmer par Hugo (docs/cloud/ia-socle.md).
-- - Verrous transactionnels par compte puis par organisation (toujours dans cet ordre) : deux appels simultanés ne
--   dépassent pas le quota.
-- - Nom en « _log » : la table est un journal ; les migrations 072 (suppression de compte) et 105 (départ d'un membre)
--   n'en réattribuent pas les lignes au patron (B1). Lignes de plus de 12 mois supprimées à chaque réservation (B2,
--   durée annoncée dans la politique de confidentialité).
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   SELECT to_regclass('public.usage_ia_log') IS NOT NULL AS table_ok,
--          (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.usage_ia_log'::regclass) AS rls,
--          has_table_privilege('authenticated', 'public.usage_ia_log', 'select') AS lisible_utilisateur,
--          has_function_privilege('authenticated', 'public.reserver_usage_ia(uuid,uuid,text,jsonb)', 'execute') AS reserver_public,
--          has_function_privilege('anon', 'public.terminer_usage_ia(bigint,text,text,integer,integer,integer,text)', 'execute') AS terminer_visiteur,
--          has_function_privilege('service_role', 'public.reserver_usage_ia(uuid,uuid,text,jsonb)', 'execute') AS serveur;
--     → table_ok t, rls t, lisible_utilisateur f, reserver_public f, terminer_visiteur f, serveur t
--   Après le déploiement de voice-intent et une dictée :
--   SELECT fonction, statut, modele, jetons_entree, jetons_sortie, duree_ms FROM public.usage_ia_log ORDER BY id DESC LIMIT 5;
-- ============================================================

CREATE TABLE IF NOT EXISTS public.usage_ia_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fonction TEXT NOT NULL CHECK (fonction ~ '^[a-z][a-z_]{1,30}$'),
  mois DATE NOT NULL,
  statut TEXT NOT NULL DEFAULT 'reserve' CHECK (statut IN ('reserve', 'reussi', 'echec')),
  plan TEXT,
  modele TEXT CHECK (modele IS NULL OR length(modele) <= 60),
  jetons_entree INTEGER CHECK (jetons_entree IS NULL OR jetons_entree >= 0),
  jetons_sortie INTEGER CHECK (jetons_sortie IS NULL OR jetons_sortie >= 0),
  duree_ms INTEGER CHECK (duree_ms IS NULL OR duree_ms >= 0),
  motif TEXT CHECK (motif IS NULL OR length(motif) <= 40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  termine_le TIMESTAMPTZ
);
COMMENT ON TABLE public.usage_ia_log IS
  'Appels à l''IA (migration 107) : quota mensuel par organisation et fonction, jetons et durée. Aucun texte dicté stocké. Accès : service_role seulement.';
CREATE INDEX IF NOT EXISTS idx_usage_ia_quota ON public.usage_ia_log (organization_id, fonction, mois);
CREATE INDEX IF NOT EXISTS idx_usage_ia_user ON public.usage_ia_log (user_id, fonction, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_ia_mois ON public.usage_ia_log (mois);

ALTER TABLE public.usage_ia_log ENABLE ROW LEVEL SECURITY;
-- Aucune policy : anon et authenticated n'y voient rien, même si un droit leur était rendu.
REVOKE ALL ON TABLE public.usage_ia_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.usage_ia_log TO service_role;

-- Plan en vigueur pour un utilisateur dans une organisation, selon la règle de l'app. Interne.
CREATE OR REPLACE FUNCTION public.plan_pour_usage_ia(p_user_id UUID, p_org UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH lignes AS (
    SELECT CASE
             WHEN s.plan IN ('free', 'decouverte', 'solo') THEN 'gratuit'
             WHEN s.plan IN ('pro', 'entreprise') THEN 'equipe'
             ELSE coalesce(s.plan, 'gratuit')
           END AS plan_brut,
           s.status, s.stripe_subscription_id,
           (to_jsonb(s) ->> 'current_period_end')::timestamptz AS fin,
           s.created_at
      FROM public.subscriptions s
     WHERE s.user_id = p_user_id
        OR s.organization_id = p_org
        OR s.user_id = (SELECT o.owner_id FROM public.organizations o WHERE o.id = p_org)
  ), effectives AS (
    SELECT CASE
             WHEN coalesce(status, 'active') NOT IN ('active', 'trialing', 'past_due') THEN 'gratuit'
             WHEN stripe_subscription_id IS NULL AND plan_brut <> 'gratuit' AND fin IS NOT NULL AND fin < now() THEN 'gratuit'
             ELSE plan_brut
           END AS plan,
           CASE
             WHEN stripe_subscription_id IS NULL AND plan_brut <> 'gratuit' AND fin IS NOT NULL AND fin < now() THEN 'canceled'
             ELSE status
           END AS status,
           created_at
      FROM lignes
  )
  SELECT coalesce((
    SELECT plan FROM effectives
     ORDER BY (status IN ('active', 'trialing', 'past_due')) DESC,
              CASE plan WHEN 'equipe' THEN 2 WHEN 'artisan' THEN 1 ELSE 0 END DESC,
              created_at DESC NULLS LAST
     LIMIT 1
  ), 'gratuit')
$$;
REVOKE ALL ON FUNCTION public.plan_pour_usage_ia(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.plan_pour_usage_ia(UUID, UUID) TO service_role;

-- Réserve un usage. Rend {autorise, id?, plan, limite (null = illimité), utilise}.
CREATE OR REPLACE FUNCTION public.reserver_usage_ia(p_user_id UUID, p_org UUID, p_fonction TEXT, p_limites JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_org UUID := p_org;
  v_mois DATE := date_trunc('month', now() AT TIME ZONE 'Europe/Paris')::date;
  v_plan TEXT;
  v_limite INTEGER;
  v_utilise INTEGER;
  v_id BIGINT;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'reserver_usage_ia : utilisateur manquant';
  END IF;
  IF p_fonction IS NULL OR p_fonction !~ '^[a-z][a-z_]{1,30}$' THEN
    RAISE EXCEPTION 'reserver_usage_ia : fonction invalide (%)', p_fonction;
  END IF;
  IF p_limites IS NULL OR jsonb_typeof(p_limites) <> 'object' THEN
    RAISE EXCEPTION 'reserver_usage_ia : limites invalides';
  END IF;

  IF v_org IS NULL THEN
    SELECT m.organization_id INTO v_org FROM public.organization_members m
     WHERE m.user_id = p_user_id ORDER BY m.joined_at ASC NULLS LAST LIMIT 1;
  END IF;
  IF v_org IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.organization_members m WHERE m.organization_id = v_org AND m.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'HORS_ORGANISATION';
  END IF;

  v_plan := public.plan_pour_usage_ia(p_user_id, v_org);
  -- -1 (ou toute valeur négative) : illimité ; plan absent ou valeur illisible : 0, rien n'est permis.
  v_limite := CASE WHEN jsonb_typeof(p_limites -> v_plan) = 'number' THEN (p_limites ->> v_plan)::numeric::integer ELSE 0 END;
  IF v_limite < 0 THEN v_limite := NULL; END IF;

  -- Un seul calcul à la fois par compte, puis par organisation (toujours dans cet ordre ; relâchés en fin de transaction).
  PERFORM pg_advisory_xact_lock(hashtextextended('usage_ia:u:' || p_user_id::text || ':' || p_fonction, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('usage_ia:' || v_org::text || ':' || p_fonction || ':' || v_mois::text, 0));

  -- Durée de conservation : 12 mois (politique de confidentialité, article 3).
  -- SKIP LOCKED : deux réservations simultanées ne se bloquent pas sur les mêmes vieilles lignes (2e relecture, B2).
  DELETE FROM public.usage_ia_log WHERE id IN (
    SELECT id FROM public.usage_ia_log
     WHERE mois < (date_trunc('month', now() AT TIME ZONE 'Europe/Paris') - interval '12 months')::date
     LIMIT 1000 FOR UPDATE SKIP LOCKED);

  -- Plafond anti-abus, quel que soit le plan : chaque appel compte, même en échec (il a coûté un appel à l'API).
  IF (SELECT count(*) FROM public.usage_ia_log
       WHERE user_id = p_user_id AND fonction = p_fonction AND created_at > now() - interval '1 minute') >= 5
     OR (SELECT count(*) FROM public.usage_ia_log
       WHERE user_id = p_user_id AND fonction = p_fonction AND created_at > now() - interval '1 day') >= 100 THEN
    RETURN jsonb_build_object('autorise', false, 'motif', 'plafond', 'plan', v_plan, 'limite', v_limite, 'utilise', NULL);
  END IF;

  -- Décomptent : réservés, réussis, et échecs provoqués par la dictée. Au plan gratuit : aussi ceux du même compte
  -- dans ses autres organisations gratuites (pas ce qu'un salarié a dicté dans l'entreprise payante de son patron).
  SELECT count(*) INTO v_utilise FROM public.usage_ia_log
   WHERE fonction = p_fonction AND mois = v_mois
     AND (statut IN ('reserve', 'reussi') OR (statut = 'echec' AND motif IN ('refus', 'illisible')))
     AND (organization_id = v_org OR (v_plan = 'gratuit' AND user_id = p_user_id AND plan = 'gratuit'));

  IF v_limite IS NOT NULL AND v_utilise >= v_limite THEN
    RETURN jsonb_build_object('autorise', false, 'motif', 'quota', 'plan', v_plan, 'limite', v_limite, 'utilise', v_utilise);
  END IF;

  INSERT INTO public.usage_ia_log (organization_id, user_id, fonction, mois, plan)
  VALUES (v_org, p_user_id, p_fonction, v_mois, v_plan)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('autorise', true, 'id', v_id, 'plan', v_plan, 'limite', v_limite, 'utilise', v_utilise + 1);
END;
$$;
REVOKE ALL ON FUNCTION public.reserver_usage_ia(UUID, UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserver_usage_ia(UUID, UUID, TEXT, JSONB) TO service_role;

-- Clôt un usage réservé (une seule fois). Rend true si la ligne a été close.
CREATE OR REPLACE FUNCTION public.terminer_usage_ia(
  p_id BIGINT, p_statut TEXT, p_modele TEXT, p_jetons_entree INTEGER, p_jetons_sortie INTEGER, p_duree_ms INTEGER, p_motif TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_n INTEGER;
BEGIN
  IF p_statut IS NULL OR p_statut NOT IN ('reussi', 'echec') THEN
    RAISE EXCEPTION 'terminer_usage_ia : statut invalide (%)', p_statut;
  END IF;
  UPDATE public.usage_ia_log
     SET statut = p_statut,
         modele = left(p_modele, 60),
         jetons_entree = greatest(p_jetons_entree, 0),
         jetons_sortie = greatest(p_jetons_sortie, 0),
         duree_ms = greatest(p_duree_ms, 0),
         motif = left(p_motif, 40),
         termine_le = now()
   WHERE id = p_id AND statut = 'reserve';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n = 1;
END;
$$;
REVOKE ALL ON FUNCTION public.terminer_usage_ia(BIGINT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.terminer_usage_ia(BIGINT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT) TO service_role;
