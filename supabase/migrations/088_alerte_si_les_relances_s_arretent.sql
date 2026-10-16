-- ============================================================
-- Migration 088: alerte si les relances s'arrêtent
-- ============================================================
-- Pourquoi : du 22 au 30 juil. 2026, le cron des relances n'a rien envoyé (timeout pg_net puis
-- colonne fantôme) avec un statut « succeeded » : 8 jours de panne verte. 070 a créé le journal
-- relance_cron_runs (une ligne par exécution, écrite par la fonction Edge), mais personne ne le
-- lit (tâche alerte-relances de docs/feuille-de-route.md).
-- Effet : chaque jour à 10 h 15 (UTC), un second job lit le journal. S'il n'y a eu aucune
-- exécution du cron depuis plus de 26 h, ou si la dernière a échoué (erreur ou envois ratés), il
-- appelle la fonction Edge alerte-relances, qui refait le même contrôle et écrit à l'adresse
-- d'exploitation (contact@mallettico.fr, ou le secret ALERTE_EMAIL), une fois par 20 h au plus.
-- 10 h 15 et pas 8 h 30 : le cron passe à 8 h ; une exécution manquée se voit dès le jour même
-- (26 h 15 depuis la précédente), une exécution faite ne déclenche rien (2 h 15).
-- Limite : si pg_cron lui-même s'arrête, les deux jobs s'arrêtent ensemble.
-- Ordre en production : déployer la fonction alerte-relances (--no-verify-jwt) AVANT d'appliquer
-- 088, puis constater un appel réel (net._http_response : 200).
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   1) SELECT * FROM public.relances_sante();        attendu : alerte f, derniere = ce matin 8 h (UTC)
--   2) SELECT alerte, raison FROM public.relances_sante(now() + interval '2 days');
--      attendu : t, « Aucune exécution des relances automatiques depuis le … »
--   3) SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'alerte-relances-quotidienne';
--      attendu : alerte-relances-quotidienne | 15 10 * * * | t
--   4) SELECT has_function_privilege('authenticated', 'public.relances_sante(timestamptz)', 'EXECUTE')
--        OR has_function_privilege('anon', 'public.reserver_alerte(text, text, interval)', 'EXECUTE');   attendu : f
-- ============================================================

-- 1. Alertes envoyées (dédoublonnage). Table d'exploitation, comme relance_cron_runs : ni
--    user_id ni organization_id (elle ne concerne aucun artisan) ; RLS active sans policy = rôle
--    de service seul.
CREATE TABLE IF NOT EXISTS public.alertes_exploitation (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sujet TEXT NOT NULL,
  raison TEXT,
  envoyee_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alertes_exploitation ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.alertes_exploitation FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_alertes_exploitation_sujet ON public.alertes_exploitation (sujet, envoyee_le DESC);

-- 2. État des relances automatiques d'après leur journal. p_maintenant sert aux vérifications.
--    Seules les exécutions réelles comptent (dry_run = false) : un essai à la main ne rassure pas.
CREATE OR REPLACE FUNCTION public.relances_sante(p_maintenant TIMESTAMPTZ DEFAULT now())
RETURNS TABLE (alerte BOOLEAN, raison TEXT, derniere TIMESTAMPTZ)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  r public.relance_cron_runs%ROWTYPE;
  v_quand TEXT;
BEGIN
  SELECT * INTO r FROM public.relance_cron_runs
  WHERE dry_run = false AND ran_at <= p_maintenant
  ORDER BY ran_at DESC
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN QUERY SELECT true, 'Aucune exécution des relances automatiques n''est enregistrée.'::text, NULL::timestamptz;
    RETURN;
  END IF;

  v_quand := to_char(r.ran_at AT TIME ZONE 'Europe/Paris', 'DD/MM/YYYY à HH24:MI');
  IF r.ran_at < p_maintenant - interval '26 hours' THEN
    RETURN QUERY SELECT true, format('Aucune exécution des relances automatiques depuis le %s (heure de Paris), soit plus de 26 h.', v_quand), r.ran_at;
  ELSIF r.error IS NOT NULL THEN
    RETURN QUERY SELECT true, format('La dernière exécution des relances automatiques (le %s) a échoué : %s', v_quand, left(r.error, 300)), r.ran_at;
  ELSIF coalesce(r.failed, 0) > 0 THEN
    RETURN QUERY SELECT true, format('Lors de la dernière exécution (le %s), %s relance(s) n''ont pas pu être envoyées.', v_quand, r.failed), r.ran_at;
  ELSE
    RETURN QUERY SELECT false, NULL::text, r.ran_at;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.relances_sante(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.relances_sante(TIMESTAMPTZ) TO service_role;

-- 3. Réserver l'envoi d'une alerte : vrai si aucune alerte du même sujet depuis p_intervalle
--    (la fonction Edge peut être appelée par n'importe qui : au plus un e-mail par période).
CREATE OR REPLACE FUNCTION public.reserver_alerte(p_sujet TEXT, p_raison TEXT, p_intervalle INTERVAL DEFAULT interval '20 hours')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('alerte:' || p_sujet));
  IF EXISTS (SELECT 1 FROM public.alertes_exploitation
             WHERE sujet = p_sujet AND envoyee_le > now() - p_intervalle) THEN
    RETURN false;
  END IF;
  INSERT INTO public.alertes_exploitation (sujet, raison) VALUES (p_sujet, p_raison);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.reserver_alerte(TEXT, TEXT, INTERVAL) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserver_alerte(TEXT, TEXT, INTERVAL) TO service_role;

-- 4. Le job quotidien : n'appelle la fonction Edge que si le journal le justifie. Pas de secret
--    dans la commande : la fonction ne lit rien de la requête. cron.schedule remplace un job du
--    même nom (rejouable).
DO $$
BEGIN
  IF to_regnamespace('cron') IS NULL OR to_regnamespace('net') IS NULL THEN
    RAISE NOTICE 'pg_cron ou pg_net absent : job alerte-relances-quotidienne non planifié';
    RETURN;
  END IF;
  PERFORM cron.schedule('alerte-relances-quotidienne', '15 10 * * *', $job$
    SELECT net.http_post(
      url := 'https://kofsbgxkrmryfetevetn.supabase.co/functions/v1/alerte-relances',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := '{}'::jsonb,
      timeout_milliseconds := 60000)
    FROM public.relances_sante() s
    WHERE s.alerte
  $job$);
END;
$$;

NOTIFY pgrst, 'reload schema';
