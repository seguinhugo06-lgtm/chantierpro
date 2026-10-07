-- ============================================================
-- Migration 074: Retours utilisateurs + codes testeurs (« un an offert »)
-- ============================================================
-- Prérequis : migration 071 (colonnes current_period_end / cancel_at_period_end de subscriptions).
--
-- 1. retours : un utilisateur signale un bug, propose une idée ; il voit le statut et la réponse.
--    Il ne peut ni modifier ni supprimer un retour (le statut et la réponse se gèrent depuis le
--    tableau de bord Supabase, table « retours »).
-- 2. codes_testeurs : codes donnés aux artisans de l'entourage. utiliser_code_testeur(code) passe
--    l'utilisateur au plan du code pour N mois, SANS Stripe ni carte bancaire. À l'échéance, la
--    tâche planifiée « expirer-offres-testeurs » le repasse en gratuit (l'app le fait aussi à
--    l'affichage). Un abonnement Stripe actif n'est jamais écrasé.
--
-- ─── Créer un code (éditeur SQL) ─────────────────────────────────────────────
--   INSERT INTO public.codes_testeurs (code, plan, duree_mois, utilisations_max, note)
--   VALUES ('AMIS-ARTISANS-7K3PX9', 'artisan', 12, 20, 'Artisans de l''entourage — oct. 2026');
--   (codes longs et imprévisibles : la fonction ne limite pas les essais)
--
-- ─── Vérification après application ──────────────────────────────────────────
--   SELECT to_regclass('public.retours'), to_regclass('public.codes_testeurs');          -- deux noms
--   SELECT proname FROM pg_proc WHERE proname = 'utiliser_code_testeur';                  -- 1 ligne
--   SELECT jobname, schedule FROM cron.job WHERE jobname = 'expirer-offres-testeurs';     -- 1 ligne
--   SELECT * FROM public.retours ORDER BY created_at DESC LIMIT 20;                        -- les retours reçus
-- ============================================================

-- 1. Retours
CREATE TABLE IF NOT EXISTS public.retours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('bug', 'idee', 'autre')),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 3 AND 5000),
  page TEXT,
  contexte JSONB NOT NULL DEFAULT '{}'::jsonb,
  statut TEXT NOT NULL DEFAULT 'nouveau' CHECK (statut IN ('nouveau', 'lu', 'en_cours', 'fait', 'refuse')),
  reponse TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.retours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users create own feedback" ON public.retours;
CREATE POLICY "Users create own feedback" ON public.retours
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND statut = 'nouveau' AND reponse IS NULL);

DROP POLICY IF EXISTS "Users see own feedback" ON public.retours;
CREATE POLICY "Users see own feedback" ON public.retours
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_retours_user_id ON public.retours(user_id);
CREATE INDEX IF NOT EXISTS idx_retours_org_id ON public.retours(organization_id);
CREATE INDEX IF NOT EXISTS idx_retours_statut ON public.retours(statut, created_at DESC);

CREATE OR REPLACE FUNCTION public.retours_maj_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_retours_updated_at ON public.retours;
CREATE TRIGGER trg_retours_updated_at BEFORE UPDATE ON public.retours
  FOR EACH ROW EXECUTE FUNCTION public.retours_maj_updated_at();

-- 2. Codes testeurs (table d'administration : ni user_id ni organization_id, aucune policy →
--    invisible depuis l'app, lue seulement par la fonction ci-dessous et le tableau de bord)
CREATE TABLE IF NOT EXISTS public.codes_testeurs (
  code TEXT PRIMARY KEY CHECK (code = upper(code) AND char_length(code) >= 8),
  plan TEXT NOT NULL CHECK (plan IN ('artisan', 'equipe')),
  duree_mois INT NOT NULL DEFAULT 12 CHECK (duree_mois BETWEEN 1 AND 24),
  utilisations_max INT NOT NULL DEFAULT 1 CHECK (utilisations_max >= 1),
  utilisations INT NOT NULL DEFAULT 0,
  expire_le TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.codes_testeurs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.codes_testeurs_utilisations (
  code TEXT NOT NULL REFERENCES public.codes_testeurs(code) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  utilise_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (code, user_id)
);
ALTER TABLE public.codes_testeurs_utilisations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.utiliser_code_testeur(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_code public.codes_testeurs%ROWTYPE;
  v_fin TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NON_CONNECTE'; END IF;

  SELECT * INTO v_code FROM public.codes_testeurs WHERE code = upper(btrim(p_code)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CODE_INCONNU'; END IF;
  IF v_code.expire_le IS NOT NULL AND v_code.expire_le < now() THEN RAISE EXCEPTION 'CODE_EXPIRE'; END IF;
  IF EXISTS (SELECT 1 FROM public.codes_testeurs_utilisations WHERE code = v_code.code AND user_id = v_uid) THEN
    RAISE EXCEPTION 'CODE_DEJA_UTILISE';
  END IF;
  IF v_code.utilisations >= v_code.utilisations_max THEN RAISE EXCEPTION 'CODE_EPUISE'; END IF;

  -- Un abonnement payé par carte reste maître : on ne l'écrase pas avec une offre gratuite.
  IF EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = v_uid AND stripe_subscription_id IS NOT NULL AND status IN ('active', 'trialing', 'past_due')
  ) THEN
    RAISE EXCEPTION 'ABONNEMENT_PAYANT_ACTIF';
  END IF;

  v_fin := now() + make_interval(months => v_code.duree_mois);

  -- cancel_at_period_end = true : l'écran « Mon plan » affiche la date de fin de l'offre.
  INSERT INTO public.subscriptions (user_id, plan, status, current_period_end, cancel_at_period_end)
  VALUES (v_uid, v_code.plan, 'active', v_fin, TRUE)
  ON CONFLICT (user_id) DO UPDATE
    SET plan = EXCLUDED.plan, status = 'active', current_period_end = v_fin,
        cancel_at_period_end = TRUE, updated_at = now();

  UPDATE public.codes_testeurs SET utilisations = utilisations + 1 WHERE code = v_code.code;
  INSERT INTO public.codes_testeurs_utilisations (code, user_id) VALUES (v_code.code, v_uid);

  RETURN jsonb_build_object('plan', v_code.plan, 'fin', v_fin, 'duree_mois', v_code.duree_mois);
END;
$$;

REVOKE ALL ON FUNCTION public.utiliser_code_testeur(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.utiliser_code_testeur(TEXT) TO authenticated;

-- 3. Fin des offres : chaque nuit, une offre testeur échue (sans abonnement Stripe) repasse en gratuit
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'expirer-offres-testeurs';
    PERFORM cron.schedule(
      'expirer-offres-testeurs',
      '17 3 * * *',
      $job$UPDATE public.subscriptions
             SET plan = 'gratuit', status = 'canceled', cancel_at_period_end = FALSE, updated_at = now()
           WHERE stripe_subscription_id IS NULL AND plan <> 'gratuit' AND current_period_end < now()$job$
    );
  ELSE
    RAISE NOTICE 'pg_cron absent : l''expiration des offres testeurs se fera seulement à l''affichage.';
  END IF;
END $$;
